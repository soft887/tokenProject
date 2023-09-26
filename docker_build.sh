AWS_REGION=eu-central-1
AWS_PREFIX=161833711594.dkr.ecr.$AWS_REGION.amazonaws.com
APP_TAG=vtvl-app
AWS_TAG=$AWS_PREFIX/$APP_TAG

cd ${0%/*}

if [ -z "$1" ]
then 
    envfile=".env"
else
    envfile=.env.$1

    if [ ! -f frontend/${envfile} ]; then
        echo "Trying to access frontend/${envfile}, but it doesn't exist. Enter just the suffix, so if your env file is called .env.test just use test as an argument. Available environments:";
        echo $(ls frontend/.env.* | awk '{print substr($1,15)}')
        exit 1;
    fi
fi

build_args=
echo "# Opening 'frontend/${envfile}'"
for ln in $(cat frontend/${envfile} | grep -v '#'); do
    build_args="${build_args}\n \t --build-arg "$ln" \\\\"
done;

echo "# Build command"
echo -e "docker build \\
    --platform linux/amd64 \\
    -t $APP_TAG:latest \\ $build_args
    ."

echo -e "\n# Push to AWS repo"
echo "# Login"
echo "aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_PREFIX"
echo "docker tag $APP_TAG $AWS_TAG"
echo "docker push $AWS_TAG"


echo -e "\n\n"
echo "# Run command"
echo "docker run -it --rm -p 6542:3000 $APP_TAG"
