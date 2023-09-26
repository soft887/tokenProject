# Vtvl Frontend
This folder contains the frontend app for the vtvl.co app.

It is written using React, and MUI library. For interactions with the blockchain, it relies on Moralis.

## App setup
The app is designed to be runnable via Docker. The build process is a two-stage one, where the second stage simply receives the app as built by `npm run build`, and serves it with *serve* on *$PORT*.

### Moralis setup
The app is using Moralis. To use it, the app needs to be given appropriate environment variables which contain Moralis keys and links. The values can be looked up in the Moralis admin dashboard, and might vary based on whether we want to connect to local node, a testnet or mainnet. Here are the values that need to be set.

- REACT_APP_MORALIS_APP_ID  (click on a desired server -> Application ID in Moralis dashboard)
- REACT_APP_MORALIS_SERVER_URL (click on a desired server -> Server URL: in Moralis dashboard)
- REACT_APP_NODE_URL (Speedy Nodes -> find the URL for the appropriate network)

These values should be set within an *.env* file within the *frontend/* directory.

#### Local development and FRPC
This section is only relevant if developing locally, and running a local node (e.g. `npx hardhat node`). The app connects to Moralis, and cannot access the Moralis functionalities if it communicated simply with the local node. Therefore, we need to set a FRPC service to open a reverse tunnel which allows Moralis to communicate with the local machine. Moralis has this documented (here)[https://www.youtube.com/watch?v=aRRS394is1U].

### Build caveats

#### Dockerfile location
The Dockerfile is located in the root of the project, as opposed to a more usual location within the frontend/ directory. This is due to the fact *package.json* references hardhat artifacts. Due to the way how Docker context works, we can't run the installation within the container without building from the project root. Dockerfile is moved to the root to highlight this, even though it would also be feasible to run it using project root as a context, and point it to a Dockerfile located elsewhere.

#### Build arguments and environment variables
The app needs to receive information about the backend to which it connects. We pass this information via environment variables. However, due to the way how CRA build process works, environment variables need to be set **at build time**, and not at run time. This means that `npm run build` step in the whole process **must** have environment variables set. Since this happens in the first stage of the Docker build, we must let Docker know which values to use. Currently, this is done through build arguments, as passable via *--build-arg* command line argument to the build. The variables that need to be passed are the ones mentioned in the Moralis setup section

To facilitate this process, a *docker_build.sh* script is available in the project root. It echoes the appropriate Docker build script based on the values set in the *frontend/.env* file. Alternatively, if a command line parameter $1 is passed, it will output the values considering *frontend/.env.$1*.

If this turns out to be inconvenient, a way to load environment variables on container run can be devised. This would allow the same container image to be run in conjunction with different backend parameters, without rebuilding.


## Common development tasks cheatsheet

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

**Note that the REACT_APP_ environment variables need to be set for this command, for them to take effect in the built app.**

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.