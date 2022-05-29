FROM node:16

ARG JOB_TOKEN

# Set environment variables
ENV APP_DIR="/usr/src/app" \
		JOB_TOKEN=${JOB_TOKEN} \
		NPM_CONFIG_LOGLEVEL="warn" \
		NODE_ENV="production" \
		NODE_OPTIONS="--max_old_space_size=8192"

WORKDIR ${APP_DIR}

COPY . .

RUN npm ci

CMD ["npm", "start"]
