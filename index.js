const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
//middle wares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.k57jaxp.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
//JWT Function
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        const serviceCollection = client.db('gamingable').collection('services');
        const reviewCollection = client.db('gamingable').collection('reviews');
        //JWT Token
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10h' })
            res.send({ token });
        })
        //Services API
        app.get('/services', async (req, res) => {
            const query = {}
            const cursor = serviceCollection.find(query);
            const services = await cursor.sort({ date: -1 }).toArray();
            res.send(services)
        });

        app.get('/homeservices', async (req, res) => {
            const query = {}
            const cursor = serviceCollection.find(query);
            const services = await cursor.limit(3).sort({ date: -1 }).toArray();
            res.send(services)
        });
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await serviceCollection.findOne(query);
            res.send(service)
        });
        app.post('/services', verifyJWT, async (req, res) => {
            const services = req.body;
            const result = await serviceCollection.insertOne(services);
            res.send(result);
        })
        //Reviews Section
        app.get('/reviews', async (req, res) => {
            const service = req.query.service;
            const query = { 'service': service }
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.sort({ date: -1 }).toArray();
            res.send(reviews)
        });
        app.get('/myreviews', verifyJWT, async (req, res) => {
            const email = req.query.userEmail;
            const decoded = req.decoded;
            if (decoded.email !== email) {
                res.status(403).send({ message: 'unauthorized access' })
            }
            let query = {}
            if (email) {
                query = { 'userEmail': email }
            }
            const cursor = reviewCollection.find(query).sort({ date: -1 });
            const reviews = await cursor.toArray();
            res.send(reviews)
        })
        app.post('/reviews', verifyJWT, async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })
        app.patch('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const date = new Date().getTime();
            const review = req.body.details;
            // details: reviewText,
            const query = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    date: date,
                    details: review
                }
            }
            const result = await reviewCollection.updateOne(query, updatedDoc);
            res.send(result)
        })
        app.delete('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await reviewCollection.deleteOne(query);
            res.send(result)
        })


    }
    finally {

    }

}
run().catch(err => console.error(err))

app.get('/', (req, res) => {
    res.send('gamingable server is running')
    res.send(new Date())
})

app.listen(port, () => {
    console.log('gamingable Server Running on', port)
})