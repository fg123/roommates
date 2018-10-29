FROM mhart/alpine-node:8
WORKDIR /app
COPY . .

RUN ["npm", "install", "--production"]
RUN ["npm", "run", "build"]
CMD ["npm", "run", "start"]
