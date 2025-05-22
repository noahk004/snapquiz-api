import { Pool, QueryResult, QueryResultRow } from "pg";

const pool = new Pool({
  user: process.env.PG_USERNAME,
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  database: process.env.PG_DATABASE,
});

pool.connect()
  .then(client => {
    return client
      .query('SELECT NOW()')
      .then(res => {
        console.log(`✅ PostgreSQL connected at: ${res.rows[0].now}`);
        client.release();
      })
      .catch(err => {
        client.release();
        console.error('❌ Error executing test query:', err.stack);
      });
  })
  .catch(err => {
    console.error('❌ Failed to connect to PostgreSQL:', err.stack);
  });

const query = (
  text: string,
  params?: any[]
): Promise<QueryResult<QueryResultRow>> => {
  return pool.query(text, params);
};

export default {
  query,
  pool,
};
