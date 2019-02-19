/*jshint esversion: 6*/
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
let compression = require('compression');

/* Set up middleware */
app.use(express.static(path.join(__dirname,'frontend')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: true, sameSite: true }
}));

app.use(compression());

const apiRouter = require('./routes/api.js');
app.use('/api', apiRouter);
app.get('*', (req, res, next) => {
    if (!res.headersSent) {
        res.sendFile('index.html', {root: path.join(__dirname, 'frontend')});
    }
});


exports.app = app;

if (require.main === module) {
    // var https = require('https');
    // var privateKey = fs.readFileSync( 'server.key' );
    // var certificate = fs.readFileSync( 'server.crt' );
    // var config = {
    //         key: privateKey,
    //         cert: certificate
    // };
    // https.createServer(config, app).listen(3000, function(){
    //     console.log('HTTPS on port 3000');
    // });
    app.listen(process.env.PORT || 3000, () => {
        console.log('HTTP');
    });
}
