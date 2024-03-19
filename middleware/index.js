// const admin = require('../config/firebase-config')

// class Middleware {
//     async decodeToken(req, res, next) {
//         console.log(req.headers)
//         const token = req.headers.authorization.split(' ')[1]
//         try {
//             const decodeValue = await admin.auth().verifyIdToken(token)
//             if (decodeValue) {
//                 req.user = decodeValue
//                 return next()
//             }
//             return res.json({ message: 'Unauthorized !' })
//         } catch (e) {
//             return res.json({ message: 'Internal Error' })
//         }
//     }
// }

// module.exports = new Middleware()

const admin = require('../config/firebase-config')

class Middleware {
    async decodeToken(req, res, next) {
        console.log('req.headers:' + req.headers)
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' })
        }
        const token = req.headers.authorization.split('Bearer ')[1]
        try {
            const decodedToken = await admin.auth().verifyIdToken(token)
            req.user = decodedToken
            return next()
        } catch (e) {
            console.error(e)
            return res.status(500).json({ message: 'Internal server error' })
        }
    }
}

module.exports = new Middleware()
