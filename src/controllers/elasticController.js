const es = require('../models/elastic');
const { Op } = require('sequelize');
const {
  img2VecService,
  convertMultipleUrls2Vec,
  text2VecService,
  convertMultipleTitles2Vec,
} = require('../services/convertToVector');
const db = require("../models");
const Product = db.product;
const Image = db.image;

const img2vec = async (data) => {
  try {
    let result;
    const { base64, url, uploadImageWs } = data;
    if (base64 || url) {
      result = await img2VecService(base64, url);
    } else if (uploadImageWs) {
      result = await convertMultipleUrls2Vec(uploadImageWs);
    }
    return result
  } catch (error) {
    console.log("error ", error);
    throw new Error('Failed to convert image to vector');
  }
}

const text2vec =  async (req, res) => {
  try {
    const { keyword, uploadTitleWs } = req.body;
    let result;
    if (keyword) {
      result = await text2VecService(keyword);
    } else if (uploadTitleWs) {
      result = await convertMultipleTitles2Vec(uploadTitleWs);
    }
    return res.status(200).json(result).end();
  } catch (error) {
    console.log("error ", error);
    res.status(500).json(error).end();
  }
}

const getAllData = async (req, res) => {
  try {
    // Lấy tất cả tài liệu từ chỉ mục 'products'
    const data = await es.esClient.search({
      index: 'products',
      size: 10000, // Giới hạn số lượng tài liệu được trả về
      body: {
        query: {
          match_all: {},
        },
      },
    });

    console.log(`Number of documents fetched: ${data.hits.hits.length}`);

    // Đếm số lượng tài liệu trong chỉ mục 'products'
    const count = await es.esClient.count({
      index: 'products', // Sử dụng chỉ mục 'products' nếu bạn muốn đếm tài liệu ở đây
      body: {
        query: {
          match_all: {},
        },
      },
    });

    console.log(`Total count of documents: ${count.count}`);

    return res.status(200).json({
      statusCode: 200,
      message: 'Data fetched successfully',
      data: data.hits.hits,
    });
  } catch (e) {
    console.error('Error fetching data:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};


const getDataProduct = async () => {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    const getProduct = await Product.findAll({
      where: {
        status: true,
        isVisible: true,
        dateVisible: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      include: [
        {
          model: Image,
          as: "images",
        },
      ],
    });

    if (getProduct.length === 0) {
      return [];
    }
    const dataMap = getProduct.map((item) => {
      return {
        id: item.id,
        title: item.title,
        price: item.price,
        image: item?.images[0]?.url || '',
        address: item.address
      };
    });

    return dataMap;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch products');
  }
};

const addElastic = async () => {
  try {
    const data = await getDataProduct();
    if (data.length === 0) {
      return true;
    }
    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        const data = {
          url: item.image
        };

        let vector;
        if (data.url === "") {
          vector = "";
        } else {
          vector = await img2vec(data);
        }

        await es.esClient.index({
          index: 'products',
          id: item.id,
          body: {
            id: item.id,
            title: item.title,
            price: item.price,
            image: item.image,
            address: item.address,
            vector: vector
          },
        });
      });
      await Promise.allSettled(promises);
    }

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

const deleteDocument = async (id) => {
  try {
    const documentExists = await es.esClient.exists({
      index: 'products',
      id: id,
    });

    if (documentExists) {
      await es.esClient.delete({
        index: 'products',
        id: id,
      });
      console.log(`Document with id ${id} deleted successfully.`);
    } else {
      console.log(`Document with id ${id} not found.`);
    }
  } catch (e) {
    console.error(e);
  }
};


const search = async (req, res) => {
  try {
    const { url, text } = req.body;

    if (!url && !text) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let query;

    if (text) {
      query = {
        multi_match: {
          query: text,
          fields: ["title"]
        }
      };
    } else if (url) {
      try {
        const data = { url: url };
        const queryVector = await img2vec(data);

        query = {
          knn: {
            field: "vector",
            query_vector: queryVector,
            k: 10,
            num_candidates: 100,
          }
        };
      } catch (e) {
        console.error('Error converting image to vector:', e);
        return res.status(500).json({
          statusCode: 500,
          message: 'Internal Server Error',
        });
      }
    }

    const result = await es.esClient.search({
      index: "products",
      body: { query },
      size: 30
    });
    if (result.hits.total.value === 0) {
      return res.status(200).json({
        statusCode: 200,
        message: 'No matching products found',
        data: [],
      });
    }

    const resultData = result.hits.hits
      .filter(item => item._score > 0.01)
      .map(item => ({
        id: item._source.id,
        title: item._source.title,
        price: item._source.price,
        image: item._source.image,
        address: item._source.address
      }));

    return res.status(200).json({
      statusCode: 200,
      message: 'Data fetched successfully',
      data: resultData,
    });
  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

module.exports = { addElastic, getAllData, img2vec, text2vec, search, getDataProduct ,deleteDocument };
