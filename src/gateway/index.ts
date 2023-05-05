import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';

const server = new ApolloServer({
  gateway: new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
      { name: 'users', url: 'http://localhost:8000/graphql' },
      { name: 'reviews', url: 'http://localhost:8001/graphql' },
      ],
    }),
  })
})

async function main() {
  const { url } = await startStandaloneServer(server, { listen: { port: 8002 } });
  console.log(`🚀  Server ready at ${url}`);
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});