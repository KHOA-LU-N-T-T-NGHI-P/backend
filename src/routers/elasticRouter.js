const elastic = require("../controllers/elasticController");

const router = require("express").Router();

router.post("/add-elastic", elastic.addElastic);
router.get("/get-all-elastic", elastic.getAllData);
router.post("/search-product", elastic.search);
router.post("/img2vec", elastic.img2vec);
router.post("/text2vec", elastic.text2vec);

module.exports = router;