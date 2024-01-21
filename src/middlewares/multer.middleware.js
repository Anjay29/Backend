import multer from "multer"



// middleware store in disk
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/Temp")
    },
    filename: function (req, file, cb) {
      // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.originalname)
    }
  })

export const upload = multer({ storage,})