import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
   const {content} = req.body

   if(!content)
   {
    throw new ApiError(400,"Content is required")
   }

   const tweet = await Tweet.create({
    content,
    owner:req.user_id
   })

   if(!tweet)
   {
    throw new ApiError(500,"Tweet not created")
   }

   return res.status(200)
   .json(new ApiResponse(200,{tweet},"Successfully created tweet"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params
    if(!isValidObjectId(userId))
    {
        throw new ApiError(400,"Invalid user id")
    }

    const tweets = await Tweet.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"ownerDetails",
                pipeline:[
                    {
                        $project:{
                            "avatar.url":1,
                            username:1
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"tweet",
                as:"likedDetails",
                pipeline:[
                    {
                        $project:{
                            likedBy:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                $likesCount:{
                    $size:"$likedDetails"
                },
                ownerDetails: {
                    $first: "$ownerDetails",
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likeDetails.likedBy"]},
                        then: true,
                        else: false
                    }
                }

            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1
            },
        },
    ])
    return res
        .status(200)
        .json(new ApiResponse(200, {tweets}, "Tweets fetched successfully"));
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {content} = req.body
    const {tweetId} = req.params

    if(!content)
    {
        throw new ApiError(400,"Content is required")
    }
    if(!isValidObjectId(tweetId))
    {
        throw new ApiError(400,"Invalid tweet id")
    }

    const tweet  = await Tweet.findById(tweetId)
    if(!tweet)
    {
        throw new ApiError(404,"Tweet not found")
    }

    if(tweet.owner.toString() !== req.user?._id.toString())
    {
        throw new ApiError(403,"only owner can do this")
    }

    const newTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content
            }
        },
        {
            new:true
        }
    )

    if(!newTweet)
    {
        throw new ApiError(500,"Tweet not updated")
    }
    return res.status(200)
    .json(new ApiResponse(200,{newTweet},"Successfully updated tweet"))

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params
    if(!isValidObjectId(tweetId))
    {
        throw new ApiError(400,"Invalid tweet id")
    }

    const tweet = await Tweet.findById(tweetId)
    if(!tweet)
    {
        throw new ApiError(404,"Tweet not found")
    }

    if(tweet.owner.toString() !== req.user?._id.toString())
    {
        throw new ApiError(403,"only owner can do this")
    }

    await Tweet.findByIdAndDelete(tweetId)
    return res.status(200)
    .json(new ApiResponse(200,{tweetId},"Successfully deleted tweet"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}