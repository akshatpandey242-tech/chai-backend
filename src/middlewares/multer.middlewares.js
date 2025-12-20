  import multer from "multer";
  
  
  //multr used as middleware or is a middleware
  const storage = multer.diskStorage({
  destination: function (req, file, cb) { //agar files aa rahi hai toh express mei toh file ka koi param ni hai , isliye multer use kiya
    //cb yaha bs callback ka naam hai
    cb(null, './public/temp')
  },
  filename: function (req, file, cb) {
    
    cb(null, file.originalname)
    //yaha hm unique naam ke wajah user ka diya hua naam hi use kr rahe hai file ke liye , because these will be in the server for little time and will get unlinked , no possibility of same name files for now  , futute tweak  - add a unique name field also
  }
})

export const upload = multer({ storage: storage })