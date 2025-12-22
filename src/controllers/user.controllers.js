import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/users.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findOne(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    /*
    get user details from frontend
    validation - not empty 
    check if user already exists  : username and email
    check for images , check for avatar 
    upload then to cloudinary , avatar
    create user object - create entry in db
    remove password and refresh token field from response
    check for user creation
    return res
    */

    const { username, fullname, email, password } = req.body
    console.log("email", email);

    //    if(fullName ===""){
    //         throw new ApiError(400 , "fullname is required")
    //    } aise individually bhi check kr sakte hai

    if ([fullname, email, username, password].some((field) => field?.trim === "")) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // like how express gives access to req.body , now multer will give access to req.files
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverimage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    console.log(avatar)
    console.log(coverImage)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
    if (!coverImage) {
        throw new ApiError(400, "Cover Image file is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverimage: coverImage.url,
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )

}
)

const loginUser = asyncHandler(async (req, res) => {
    //req body => data
    //username or email se check
    //find user in db
    //password check
    //access and refresh token
    //send cookies (how we give the tokens)


    const { username, email, password } = req.body
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exit")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "invalid user credentials , password incorrect")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    console.log(accessToken)

    //even though 110 jo user define kiya hai , db mei uske pass tokens aa gaye hai , but jo refrence hamare pass hai wo purana hai , usme update ni hua hai , now 2 options if not expensive , db se request maar ke wapas se wo user lelo  , ya phie already bane user ko update krdo ... philal mei usi user lo wapas se db se laake nae const mei rakhunga
    // user.password = undefined
    // user.accessToken = accessToken
    // user.refreshToken = refreshToken

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //ab cookies bhejne ke liye setup

    //cookies can be modified by anyone , by checking the following options , now cookies can only be modified by the server
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.
        status(200).
        cookie("accessToken", accessToken, options).
        cookie("refreshToken", refreshToken, options).
        json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken // even though we have set the tokens in the cookies , we also manually send them to the user in case they want to explicitly want to make use of them , for ex, for a mobile app or something idk
                },
                "User logged in successfully"

            )
        )



}

)

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expires or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newrefreshToken } = await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken)
            .cookie("refreshToken", newrefreshToken)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken, refreshToken: newrefreshToken
                    },
                    "user tokens refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
        throw new ApiError(400, "current password and new password are required")
    }

    // const user = await User.findOne({password : currentPassword})

    const user = await User.findById(req.user._id)
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "current password is incorrect")
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
            "Password changed successfully"
        ))


}
)


const getCurrentUser = asyncHandler(async (req, res) => {
    return res.
        status(200).
        json(new ApiResponse(
            200,
            req.user,
            "Current logged in user details"
        ))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, username } = req.body;

    if (!fullname || !username) {
        throw new ApiError(400, "All fields are required")
    }

    User.findByIdAndUpdate(
        req.user?._id,
        {
            $ser: {
                fullname,
                email: email
            }
        },
        { new: true }
    ).select("=password -refreshToken")

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "account details updated"
        ))
})

const updateUserAvatar = asyncHandler(async(req ,res) => {
    const avatarLocalPath = res.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400 , "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar: avatar.url
            }
        },
        {new : true}
    )

    return res
    .status(200).
    json(new ApiResponse(
        200,
        user,
        "Avatar uploaded successfully"
    ))
})

const updateUserCoverImage = asyncHandler(async(req ,res) => {
    const coverImageLocalPath = res.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400 , "Cover image file is missing")
    }

    const coverimage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverimage.url){
        throw new ApiError(400 , "Error while uploading coverimage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverimage: coverimage.url
            }
        },
        {new : true}
    )

    return res
    .status(200).
    json(new ApiResponse(
        200,
        user,
        "Cover Image uploaded successfully"
    ))
})

const getUserChannelProfile = asyncHandler(async (req , res) => {
    const {username} = req.params
    if(!usename?.trim){
        throw new ApiError(400 , "usename is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username : username?.toLowerCase
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in : [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false ,
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username : 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar : 1 ,
                coverimage: 1 ,
                email: 1,

            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404 , "channel does not exists ")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200 , channel[0] , "User channe fetched successfully")
    )
})

const getWaTchHistory = asyncHandler(async(req,res) => {
    //the _id saved in the mongodb is in the form of string like "ObjectId: ....." and this dot dot contains the actual mongodb object id , but whenever we use some mongodg method , we pass the _id as is and it internally converts it into the mongodb id , but for aggreagate  , we need to pass the actual id  . so yeah , point to be noted , plain old _id returns a string , and not mongodb object id

    const user = await User.aggregate([
        {
            $match: {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from : "videos",
                localField : "watchHistory",
                foreignField: "_id",
                as : "watchHistory",
                pipeline:[
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipelines:[
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: $owner
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.
    status(200).
    json(
        new ApiResponse (
            200,
            user[0].watchHistory,
            "watch history fetched successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWaTchHistory
}