ARG NODE_IMAGE=node:16-slim
ARG APP_USER=vtvl_appuser
ARG APP_USERGROUP=vtvl_appgroup
ARG UID_PREFIX=513
ARG PORT=3000

FROM $NODE_IMAGE as builder

ARG REACT_APP_MORALIS_APP_ID
ARG REACT_APP_MORALIS_SERVER_URL
ARG REACT_APP_NODE_URL


WORKDIR /builder/frontend

# we need to include the hardhat contracts - a level up since that's how we're linking to it from our package.json
COPY hardhat/artifacts ../hardhat/artifacts

# first just transfer the package files to take advantage of Docker cache and not rebuild everything if only code was modified
COPY frontend/package.json .
COPY frontend/package-lock.json .

RUN npm ci

# Copy the files
COPY frontend/ .

# We need these env vars to be able to proceed with the build
# Add them as late as possible not to mess up the build cache, given that they aren't needed before build
RUN (test -n "$REACT_APP_MORALIS_APP_ID" && test -n "$REACT_APP_MORALIS_SERVER_URL") || (echo "REACT_APP_MORALIS_APP_ID and REACT_APP_MORALIS_SERVER_URL must be set. Set with '--build-arg'" && false)
ENV REACT_APP_MORALIS_APP_ID=${REACT_APP_MORALIS_APP_ID}
ENV REACT_APP_MORALIS_SERVER_URL=${REACT_APP_MORALIS_SERVER_URL}
ENV REACT_APP_NODE_URL=${REACT_APP_NODE_URL}

# Build the app
RUN npm run build

################################################################################
########### Stage 2 
################################################################################
ARG NODE_IMAGE
FROM $NODE_IMAGE as production

# Use the same params
ARG APP_USER
ARG APP_USERGROUP
ARG UID_PREFIX
ARG PORT
ARG NODE_ENV
ARG PROJECT_BASE

# set the env vars based on the ARGs
ENV PORT=${PORT}
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

# add the user and group
RUN groupadd --gid ${UID_PREFIX}1 ${APP_USERGROUP} && \
    useradd --home-dir /built_app --create-home --uid ${UID_PREFIX}1 --gid ${APP_USERGROUP} ${APP_USER}

RUN npm install serve

# Just copy the built app from the first stage
COPY --from=builder --chown=${APP_USER}:${APP_USERGROUP} /builder/frontend/build ./built_app

# we need to have serve app instaled - we didn't copy it over from the past build
# RUN npm install serve && chown -R ${APP_USER}:${APP_USERGROUP} /app/built_app

USER ${APP_USER}

CMD [ "npx", "serve", "-s", "built_app", "-l", "$PORT" ]
