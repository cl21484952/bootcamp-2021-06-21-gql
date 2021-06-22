"use strict";

const { ApolloServer, gql } = require("apollo-server-lambda");
const { randomBase64Id } = require("./other");
const { DynamoDB } = require("aws-sdk");

const dynamoDB = new DynamoDB.DocumentClient();
const AUTHOR_TABLENAME = "BootcampAuthorCollection";
const TWEET_TABLENAME = "BootcampTweetCollection";

const typeDefs = gql`
  type Query {
    authorList: [Author!]!
    authorView(authorID: ID!): Author
    tweetList: [Tweet!]!
    tweetView(tweetID: ID!): Tweet
  }

  type Mutation {
    authorAdd(input: AuthorAdd!): Author!
    authorEdit(input: AuthorEdit!): Author
    tweetAdd(input: TweetAdd!): Tweet!
    tweetEdit(input: TweetEdit!): Tweet
  }

  type Author {
    authorID: ID!
    name: String!
    tweets: [Tweet!]!
  }

  input AuthorAdd {
    name: String!
  }
  input AuthorEdit {
    authorID: ID!
    name: String!
  }

  type Tweet {
    tweetID: ID!
    text: String!
    byAuthor: Author!
  }

  input TweetAdd {
    text: String!
    byAuthorID: ID!
  }
  input TweetEdit {
    tweetID: ID!
    text: String!
  }
`;

const resolvers = {
  Author: {
    tweets: async (src, args, ctx) => {
      const dbRes = await ctx.dynamoDB
        .scan({
          TableName: TWEET_TABLENAME,
        })
        .promise();
      return (
        dbRes.Items &&
        dbRes.Items.filter((ele) => ele.byAuthorID === src.authorID)
      );
    },
  },
  Tweet: {
    byAuthor: async (src, args, ctx) => {
      const dbRes = await ctx.dynamoDB
        .get({
          TableName: AUTHOR_TABLENAME,
          Key: {
            authorID: src.byAuthorID,
          },
        })
        .promise();
      return dbRes.Item;
    },
  },
  Query: {
    authorList: async (src, args, ctx) => {
      const results = await ctx.dynamoDB
        .scan({
          TableName: AUTHOR_TABLENAME,
        })
        .promise();
      return results.Items;
    },
    authorView: async (src, args, ctx) => {
      const dbRes = await ctx.dynamoDB
        .get({
          TableName: AUTHOR_TABLENAME,
          Key: {
            authorID: args.authorID,
          },
        })
        .promise();
      return dbRes.Item;
    },
    tweetList: async (src, args, ctx) => {
      const results = await ctx.dynamoDB
        .scan({
          TableName: TWEET_TABLENAME,
        })
        .promise();
      return results.Items;
    },
    tweetView: async (src, args, ctx) => {
      const dbRes = await ctx.dynamoDB
        .get({
          TableName: TWEET_TABLENAME,
          Key: {
            tweetID: args.tweetID,
          },
        })
        .promise();
      return dbRes.Item;
    },
  },
  Mutation: {
    authorAdd: async (src, args, ctx) => {
      const data = args.input;

      data["authorID"] = `${Date.now().toString(36)}${randomBase64Id(5)}`;
      // throw new Error(JSON.stringify(data))

      await ctx.dynamoDB
        .put({
          TableName: AUTHOR_TABLENAME,
          Item: data,
        })
        .promise();

      return data;
    },
    authorEdit: async (src, args, ctx) => {
      const data = args.input;

      const dbRes = await ctx.dynamoDB
        .get({
          TableName: AUTHOR_TABLENAME,
          Key: {
            authorID: data.authorID,
          },
        })
        .promise();
      const dbAuthor = dbRes.Item;

      if (!dbAuthor) {
        return null;
      }

      dbAuthor.name = data.name;
      await dynamoDB
        .put({
          TableName: AUTHOR_TABLENAME,
          Item: dbAuthor,
        })
        .promise();

      return dbAuthor;
    },
    tweetAdd: async (src, args, ctx) => {
      const data = args.input;

      if (!data.byAuthorID || data.byAuthorID.length === 0) {
        throw new Error("byAuthorID is not provided!");
      }
      const dbRes = await ctx.dynamoDB
        .get({
          TableName: AUTHOR_TABLENAME,
          Key: {
            authorID: data.byAuthorID,
          },
        })
        .promise();
      if (!dbRes.Item) {
        throw new Error("No such author!");
      }

      data["tweetID"] = `${Date.now().toString(36)}${randomBase64Id(5)}`;

      await ctx.dynamoDB
        .put({
          TableName: TWEET_TABLENAME,
          Item: data,
        })
        .promise();

      return data;
    },
    tweetEdit: async (src, args, ctx) => {
      const data = args.input;

      const dbRes = await ctx.dynamoDB
        .get({
          TableName: TWEET_TABLENAME,
          Key: {
            tweetID: data.tweetID,
          },
        })
        .promise();
      const dbTweet = dbRes.Item;

      if (!dbTweet) {
        return null;
      }

      dbTweet.text = data.text;
      await dynamoDB
        .put({
          TableName: TWEET_TABLENAME,
          Item: dbTweet,
        })
        .promise();

      return dbTweet;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: {
    dynamoDB,
  },
  playground: {
    endpoint: "graphql",
  },
});

module.exports.graphql = server.createHandler({
  cors: true,
});
