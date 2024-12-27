import { Router } from "express";
import {registerUser,loginUser, logoutUser,refreshAccessToken, changecurrentpassword, getCurrentuser, 
    updateAccountDetails, updateUserAvatar, updateUserCoverImage,
    getUserChannelProfile,
    getwatchhistory} from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser)


router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT , logoutUser)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT,changecurrentpassword)
router.route("/change-user").get(verifyJWT,getCurrentuser)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJWT,upload.single("/coverImage"),updateUserCoverImage)
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)
router.route("/history").get(verifyJWT,getwatchhistory)

export default router