const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_xzY6tCi8VvOB@ep-aged-frost-a1m88gal-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Database connected successfully:', res.rows[0].now);
    }
});

app.post('/addAccount', async (req, res) => {
    const { accountID, introducerID } = req.body;

    try {
        // Check if the accountID already exists
        const accountExistsQuery = await pool.query(
            'SELECT * FROM accounts WHERE AccountID = $1',
            [accountID]
        );

        if (accountExistsQuery.rows.length > 0) {
            return res.status(400).json({ error: 'Account already exists. Not valid.' });
        }

        let beneficiaryID;

        // Count how many times the introducerID appears in the accounts table
        const introducerCountQuery = await pool.query(
            'SELECT COUNT(*) FROM accounts WHERE IntroducerID = $1',
            [introducerID]
        );

        // Ensure we start counting from 1
        const introducerCount = parseInt(introducerCountQuery.rows[0].count, 10) + 1;
        console.log(`IntroducerID ${introducerID} appears ${introducerCount} times (starting from 1)`);

        if (introducerCount % 2 === 1) {
            // Odd count: Beneficiary is the introducer
            beneficiaryID = introducerID;
            console.log(`Introducer count is odd, setting beneficiary to introducerID: ${beneficiaryID}`);
        } else {
            // Even count: Find introducer's introducer's introducer
            console.log(`Fetching introducer's introducer's introducer for introducerID: ${introducerID}`);

            let currentIntroducerID = introducerID;
            let depth = 2; // Go 3 levels deep

            while (depth > 0) {
                const introducerIntroducerQuery = await pool.query(
                    'SELECT IntroducerID FROM accounts WHERE AccountID = $1',
                    [currentIntroducerID]
                );

                if (introducerIntroducerQuery.rows.length > 0) {
                    currentIntroducerID = introducerIntroducerQuery.rows[0].introducerid;
                    console.log(`Found introducer at depth ${4 - depth}: ${currentIntroducerID}`);
                } else {
                    // If no further introducer is found, default to 0
                    currentIntroducerID = 0;
                    console.log(`No further introducer found at depth ${4 - depth}, defaulting to 0`);
                    break;
                }

                depth--;
            }

            beneficiaryID = currentIntroducerID;
        }

        // Insert the new account
        await pool.query(
            'INSERT INTO accounts (AccountID, IntroducerID, BeneficiaryID) VALUES ($1, $2, $3)',
            [accountID, introducerID, beneficiaryID]
        );

        res.status(200).json({ message: 'Account added successfully' });
    } catch (error) {
        console.error('Error in /addAccount:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




// Endpoint to fetch all accounts
app.get('/accounts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM accounts');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  
});