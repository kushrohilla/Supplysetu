const { Client } = require('pg');

const c = new Client('postgresql://postgres:postgres@localhost:5434/supplysetu');
c.connect().then(() => {
    return c.query("SELECT * FROM products LIMIT 5;");
}).then(r => {
    console.log(`Found ${r.rowCount} products locally!`);
    c.end();
}).catch(err => {
    console.log("Local DB is empty or missing:", err.message);
    c.end();
});
