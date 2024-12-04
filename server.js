const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
require('express-async-handler');
require('dotenv').config();
const cors = require('cors');
require('./src/models/elastic');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
const authRouter = require('./src/routers/authRouter');
const userRouter = require('./src/routers/userRouter');
const elasticRouter = require('./src/routers/elasticRouter');
const cartRouter = require('./src/routers/cartRouter');
const orderRouter = require('./src/routers/orderRouter');
const adminRouter = require('./src/routers/adminRouter');
// const elastic = require('./src/models/elastic');

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/elastic', elasticRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);
app.use('/api/admin', adminRouter);



// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Start cron job
const startCronJob = require('./src/utils/cronJob');
startCronJob();