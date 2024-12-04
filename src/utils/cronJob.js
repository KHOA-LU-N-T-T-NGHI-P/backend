const cronJob = require('cron').CronJob;
const { addElastic } = require('../controllers/elasticController');


const job = new cronJob('37 11 * * *', async () => {
  console.log('Cron job started');
  await addElastic();
  console.log('Cron job ended');
})

module.exports = () => {
  job.start();
}