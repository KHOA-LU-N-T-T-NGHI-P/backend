const ES = require("@elastic/elasticsearch");

const elasticConfig = {
  ip: process.env.ELASTIC_HOST || "localhost",
  port: process.env.ELASTIC_PORT || 9200,
  user: process.env.ELASTIC_USER || "elastic",
  pass: process.env.ELASTIC_PASSWORD || "changeme",
};

const esClient = new ES.Client({
  node: `http://${elasticConfig.ip}:${elasticConfig.port}`,
  auth: {
    username: elasticConfig.user,
    password: elasticConfig.pass,
  },
});

esClient.ping()
  .then(() => {
    console.log("Elasticsearch is connected");
  })
  .catch((err) => {
    console.log("Elasticsearch is not connected", err);
  });

const deleteIndex = async () => {
  try {
    const indexExists = await esClient.indices.exists({ index: "products" });
    if (indexExists) {
      await esClient.indices.delete({ index: "products" });
      console.log("Index 'products' deleted successfully");
    } else {
      console.log("Index 'products' does not exist");
    }
  } catch (err) {
    console.log("Error deleting index", err);
  }
}

// Tạo chỉ mục với mappings
const createIndex = async () => {
  try {
    const indexExists = await esClient.indices.exists({ index: "products" });
    if (!indexExists) {
      await esClient.indices.create({
        index: "products",
        body: {
          settings: {
            analysis: {
              analyzer: {
                custom_text_analyzer: {
                  type: "custom",
                  tokenizer: "standard",
                  filter: ["lowercase", "stop", "porter_stem"],
                },
              },
            },
          },
          mappings: {
            properties: {
              id: { type: "integer" },
              title: {
                type: "text",
                analyzer: "custom_text_analyzer",
                fields: {
                  keyword: { type: "keyword", ignore_above: 256 },
                },
              },
              price: { type: "float" },
              image: { type: "text", index: false },
              address: {
                type: "text",
                analyzer: "custom_text_analyzer",
                fields: {
                  keyword: { type: "keyword", ignore_above: 256 },
                },
              },
              vector: {
                type: "dense_vector",
                dims: 512,
                similarity: "l2_norm",
              },
            },
          },
        },
      });
      console.log("Index 'products' created successfully");
    } else {
      console.log("Index 'products' already exists");
    }
  } catch (err) {
    console.log("Error creating index", err);
  }
};

createIndex();

module.exports = { esClient };
