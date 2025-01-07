import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const video = await Video.findById(videoId)

    if(!video)
    {
        throw new ApiError(404,"Video not found")
    }

    const comments = await Comment.aggregate([
        {
            $match:{
                video: mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup:{
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields:{
                likesCount: {$size: "$likes"},
                owner:{$first:"$owner"},
                isLiked:{
                    $cond:{
                        if:{
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $sort:{
                createdAt: -1
            }
        },
        {
            $project:{
                content:1,
                createdAt:1,
                likesCount:1,
                owner:{
                    fullName:1,
                    username:1,
                    "avatar.url":1
                },
                isLiked:1
            }
        }
    ])

    const options = {
        page: parseInt(page,10),
        limit: parseInt(limit,10)
    }

    const comment = await Comment.aggregatePaginate(comments,options)

    return res.status(200)
    .json(new ApiResponse(200,{comment},"Comments retrieved successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params
    const {content} = req.body

    if(!content)
    {
        throw new ApiError(400,"Content is required")
    }

    const video = await VideoColorSpace.findById(videoId)
    if(!video)
    {
        throw new ApiError(404,"Video not found")
    }


    const comment = await Comment.create({
        content,
        owner: req.user?._id,
        video: videoId
    })

    if(!comment)
    {
        throw new ApiError(500,"Comment could not be created")
    }

    return res.status(200)
    .json(new ApiResponse(200, "Comment added successfully", comment))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {content} = req.body
    const {commentId} = req.params

    if(!content)
    {
        throw new ApiError(400,"Content is required")
    }

    const comment = await Comment.findById(commentId)
    if(!comment)
    {
        throw new ApiError(404,"Comment not found")
    }

    if(comment.user.toString() !== req.user?._id.toString())
    {
        throw new ApiError(403,"You are not allowed to update this comment")
    }
    const updatedcomment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set:{
                content,
            },
        },
        {new:true}
    )

    if(!updateComment)
    {
        throw new ApiError(500,"Comment could not be updated")
    }

    return res.status(200)
    .json(new ApiResponse(200, "Comment updated successfully", updatedcomment))

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params


    const comment = await Comment.findById(commentId)

    if(!comment)
    {
        throw new ApiError(404,"Comment not found")
    }

    if(content.user.toString() !== req.user?._id.toString())
    {
        throw new ApiError(403,"You are not allowed to delete this comment")
    }

    await Comment.findByIdAndDelete(commentId)

    await Like.deleteMany({
        comment: commentId,
        likedBy: req.user
    })

    return res.status(200)
    .json(new ApiResponse(200,"Comment deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }