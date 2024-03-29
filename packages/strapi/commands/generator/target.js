/**
 * Module dependencies
 */

/* eslint-disable prefer-template */
// Node.js core.
const path = require('path')
const util = require('util')

// Public node modules.
const _ = require('lodash')
const asyncUntil = require('async/until')
const report = require('reportback')()

// Local dependencies.
const folderUtils = require('./utils/folder')
const templateUtils = require('./utils/template')
const jsonFileUtils = require('./utils/jsonfile')
const copyUtils = require('./utils/copy')

/**
 * @param {[Type]} scope Description
 * @param {[Type]} subtarget Description
 * @return {[Type]} Description
 */

function mergeSubtargetScope(scope, subtarget) {
  return _.merge(scope, _.isObject(subtarget) ? subtarget : {})
}

/**
 * Known helpers
 *
 * @type {Array}
 */

const knownUtilss = ['folder', 'template', 'jsonfile', 'file', 'copy']

function targetIsUtils(target) {
  return _.some(target, (subTarget, key) => _.includes(knownUtilss, key))
}

/**
 * @param {String|Object} target Description
 * @param {Object} scope Description
 * @param {Function} cb Description
 * @return {[type]} Description
 */

function parseTarget(target, scope, cb) {
  if (_.isString(target)) {
    target = {
      generator: target,
    }
  }

  // Interpret generator definition.
  if (targetIsUtils(target)) {
    return cb(null, target)
  }

  if (target.generator) {
    // Normalize the subgenerator reference.
    let subGeneratorRef
    if (_.isString(target.generator)) {
      subGeneratorRef = {
        module: target.generator,
      }
    } else if (_.isObject(target.generator)) {
      subGeneratorRef = target.generator
    }

    if (!subGeneratorRef) {
      return cb(
        new Error(
          'Generator Error :: Invalid subgenerator referenced for target `' +
            scope.rootPath +
            '`'
        )
      )
    }

    // Now normalize the sub-generator.
    let subGenerator

    // No `module` means we'll treat this subgenerator as an inline generator definition.
    if (!subGeneratorRef.module) {
      subGenerator = subGeneratorRef
      if (subGenerator) {
        return cb(null, subGenerator)
      }
    }

    // Otherwise, we'll attempt to load this subgenerator.
    if (_.isString(subGeneratorRef.module)) {
      // Lookup the generator by name if a `module` was specified
      // This allows the module for a given generator to be
      // overridden.
      const configuredReference =
        scope.modules && scope.modules[subGeneratorRef.module]

      // Refers to a configured module.
      // If this generator type is explicitly set to `false`,
      // disable the generator.
      if (configuredReference) {
        return cb(null, configuredReference)
      }
      if (configuredReference === false) {
        return cb(null)
      }

      // If `configuredReference` is undefined, continue on
      // and try to require the module.
    }

    // At this point, `subGeneratorRef.module` should be a string,
    // and the best guess at the generator module we're going
    // to get.
    const { module } = subGeneratorRef
    let requireError

    // Try requiring it directly as a path.
    try {
      subGenerator = require(module)
    } catch (e0) {
      requireError = e0
    }

    // Try the scope's `rootPath`.
    if (!subGenerator) {
      try {
        const asDependencyInRootPath = path.resolve(
          scope.rootPath,
          'node_modules',
          module
        )
        subGenerator = require(asDependencyInRootPath)
      } catch (e1) {
        requireError = e1
      }
    }

    // Try the current working directory.
    if (!subGenerator) {
      try {
        subGenerator = require(path.resolve(
          process.cwd(),
          'node_modules',
          module
        ))
      } catch (e1) {
        requireError = e1
      }
    }

    // If we couldn't find a generator using the configured module,
    // try requiring `strapi-generate-<module>` to get the core generator.
    if (!subGenerator && !module.match(/^strapi-generate-/)) {
      try {
        if (process.mainModule.filename.indexOf('yarn') !== -1) {
          subGenerator = require(path.resolve(
            process.mainModule.paths[2],
            'strapi-generate-' + module
          ))
        } else {
          subGenerator = require(path.resolve(
            process.mainModule.paths[1],
            'strapi-generate-' + module
          ))
        }
      } catch (e1) {
        requireError = e1
      }
    }

    // If we were able to find it, send it back!
    if (subGenerator) {
      return cb(null, subGenerator)
    }

    // But if we still can't find it, give up.
    return cb(
      new Error(
        'Error: Failed to load `' +
          subGeneratorRef.module +
          '`...' +
          (requireError ? ' (' + requireError + ')' : '') +
          ''
      )
    )
  }

  return cb(
    new Error(
      'Unrecognized generator syntax in `targets["' +
        scope.keyPath +
        '"]` ::\n' +
        util.inspect(target)
    )
  )
}

/**
 *
 * @param {[Type]} target Description
 * @return {Boolean} Description
 */

function isValidTarget(target) {
  // Is using a helper.
  // Or is another generator def.
  return (
    _.isObject(target) && (targetIsUtils(target) || _.has(target, 'targets'))
  )
}

module.exports = (options, next) => {
  const sb = report.extend(next)

  // Options.
  let { target } = options
  let { scope } = options
  const parentGenerator = options.parent
  const { recursiveGenerate } = options

  const maxResolves = 5
  // eslint-disable-next-line no-underscore-dangle
  let _resolves = 0

  asyncUntil(
    (cb) => {
      cb(null, isValidTarget(target) || ++_resolves > maxResolves)
    },
    (asyncCb) => {
      parseTarget(target, scope, (err, resolvedTarget) => {
        if (err) {
          return asyncCb(err)
        }
        target = resolvedTarget
        return asyncCb()
      })
    },
    (err) => {
      if (err) {
        return sb(err)
      }
      if (!isValidTarget(target)) {
        return sb(
          new Error(
            'Generator Error :: Could not resolve target `' +
              scope.rootPath +
              '` (probably a recursive loop)'
          )
        )
      }

      // Pass down parent Generator's template directory abs path.
      scope.templatesDirectory = parentGenerator.templatesDirectory
      if (target.copy) {
        scope = mergeSubtargetScope(
          scope,
          _.isString(target.copy)
            ? {
                templatePath: target.copy,
              }
            : target.copy
        )
        return copyUtils(scope, sb)
      }

      if (target.folder) {
        scope = mergeSubtargetScope(scope, target.folder)
        return folderUtils(scope, sb)
      }

      if (target.template) {
        scope = mergeSubtargetScope(
          scope,
          _.isString(target.template)
            ? {
                templatePath: target.template,
              }
            : target.template
        )

        return templateUtils(scope, sb)
      }

      if (target.jsonfile) {
        if (_.isFunction(target.jsonfile)) {
          scope = _.merge(scope, {
            data: target.jsonfile(scope),
          })
        } else if (_.isPlainObject(target.jsonfile)) {
          scope = mergeSubtargetScope(scope, target.jsonfile)
        }

        return jsonFileUtils(scope, sb)
      }

      // If we made it here, this must be a recursive generator.
      // Now that the generator definition has been resolved,
      // call this method recursively on it, passing along our
      // callback.
      // eslint-disable-next-line no-underscore-dangle
      if (++scope._depth > scope.maxHops) {
        return sb(
          new Error(
            '`maxHops` (' +
              scope.maxHops +
              ') exceeded! There is probably a recursive loop in one of your generators.'
          )
        )
      }
      return recursiveGenerate(target, scope, sb)
    }
  )
}
