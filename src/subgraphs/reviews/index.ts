import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import gql from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';
import data from '../../data';

const typeDefs = gql`
  type Query {
    review(id: ID!): Review
    reviews: [Review]
  }

  type Review {
      id: ID!
      body: String
      author: User @provides(fields: "username")
  }

  type User @key(fields: "id") {
      id: ID!
      username: String! @external
      reviews: [Review]
  }

  extend schema
      @link(url: "https://specs.apollo.dev/federation/v2.3",
          import: ["@key", "@shareable", "@provides", "@external"])
`;

const resolvers = {
  Query: {
    reviews() {
      return data.reviews;
    },
    review(_, { id }) {
      return data.reviews.find(el => el.id === id);
    },
  },
  Review: {
    __resolveReference(review) {
      return {
        ...review,
        ...data.reviews.find((el) => el.id === review.id)
      };
    },
    author(parent) {
      const review = data.reviews.find(el => el.id === parent.id);
      const user = data.users.find(el => el.id === review.author)
      return user;
    }
  },
  User: {
    __resolveReference(user) {
      return {
        ...user,
        ...data.users.find((el) => el.id === user.id)
      };
    },
    reviews(parent) {
      const user = data.users.find(el => el.id === parent.id);
      const review = data.reviews.find(el => el.id === user.review);
      return review;
    }
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

async function main() {
  const { url } = await startStandaloneServer(server, { listen: { port: 8001 } });
  console.log(`🚀 Server ready at ${url}`);
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});

