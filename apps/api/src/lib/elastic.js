import { Client } from '@elastic/elasticsearch';

export const esClient = new Client({
  node: process.env.ES_URL || 'http://localhost:9200'
});

export const ES_INDEX = process.env.ES_INDEX || 'sg-pois-main';
