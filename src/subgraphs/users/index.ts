import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import gql from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { pubsub } from '../../pubsub/index'
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import { createServer } from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
// import { PubSub } from 'graphql-subscriptions';
import bodyParser from 'body-parser';
import cors from 'cors';
import data from '../../data';

const PORT = 8000;

const typeDefs = gql`
  type Query {
    user(id: ID!): User
    users: [User]
  }

  type Mutation {
    createUser(input: CreateUserInput!): User
  }

  type Subscription {
    userCreated: User
  }

  input CreateUserInput {
    username: String!
  }

  type User @key(fields: "id") {
    id: ID!
    username: String! @shareable
  }

  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3",
          import: ["@key", "@shareable"])
`;

const resolvers = {
  Query: {
    users() {
      return data.users;
    },
    user(_, { id }) {
      return data.users.find(el => el.id === id);
    },
  },
  Mutation: {
    createUser(_, { input }) {
      data.users.push({ ...input, id: data.users.length + 1 });
      const user = data.users[data.users.length - 1];

      pubsub.publish('USER_CREATED', { userCreated: user });

      return user;
    }
  },
  Subscription: {
    userCreated: {
      subscribe(_, args) {
        return pubsub.asyncIterator(['USER_CREATED']);
      }
    }
  },
  User: {
    __resolveReference(user) {
      return {
        ...user,
        ...data.users.find((el) => el.id === user.id)
      };
    },
  },
};

const schema = buildSubgraphSchema({ typeDefs, resolvers })

const app = express();
const httpServer = createServer(app);

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});
const serverCleanup = useServer({ schema }, wsServer);

const server = new ApolloServer({
  schema,
  plugins: [
    // Proper shutdown for the HTTP server.
    ApolloServerPluginDrainHttpServer({ httpServer }),

    // Proper shutdown for the WebSocket server.
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

async function main() {
  await server.start();
  app.use('/graphql', cors<cors.CorsRequest>(), bodyParser.json(), expressMiddleware(server));

  httpServer.listen(PORT, () => {
    console.log(`🚀 Query endpoint ready at http://localhost:${PORT}/graphql`);
    console.log(`🚀 Subscription endpoint ready at ws://localhost:${PORT}/graphql`);
  });
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});

