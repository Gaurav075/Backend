import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    if(!name || !description)
    {
        throw new ApiError(400,"Name and description are required")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id
    })

    if(!playlist)
    {
        throw new ApiError(500,"Failed to create playlist")
    }

    return res.status(200)
    .json(new ApiResponse(200, playlist,"Playlist created successfully"))

    //TODO: create playlist
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists

    if(!isValidObjectId(userId))
    {
        throw new ApiError(400,"Invalid user id")
    }

    const userPlaylist = await Playlist.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $addFields:{
                totalVideos:{
                    $size: "$videos"
                },
                totalViews:{
                    $sum: "$videos.views"
                }
            }
        },
        {
            $projects:{
                _id:1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt:1
            }
        }
    ])
    return res.status(200)
    .json(new ApiResponse(200,userPlaylist,"User playlists retrieved successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!isValidObjectId(playlistId))
    {
        throw new ApiError(400,"Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist)
    {
        throw new ApiError(404,"Playlist not found")
    }

    const getplaylist = await Playlist.aggregate([
        {
            $match:{
                _id: mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $match:{
                "videos.isPublished": true
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
            $addFields:{
                totalVideos:{
                    $size: "$videos"
                },
                totalViews:{
                    $sum: "$videos.views"
                },
                owner:{$first:"$owner"}
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1
                },
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                }
            }
        }
    ])

    return res.status(200)
    .json(new ApiResponse(200,getplaylist[0],"Playlist retrieved successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId))
    {
        throw new ApiError(400,"Invalid playlist or video id")
    }

    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)

    if(!playlist)
    {
        throw new ApiError(404,"Playlist not found")
    }

    if(!video)
    {
        throw new ApiError(404,"Video not found")
    }

    if(playlist.owner.toString() !== req.user?._id.toString())
    {
        throw new ApiError(403,"You are not allowed to add videos to this playlist")
    }

    const addvideos = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet:{
                videos: videoId
            }
        },
        {new:true}
    )

    if(!addvideos)
    {
        throw new ApiError(500,"Failed to add video to playlist")
    }

    return res.status(200)
    .json(new ApiResponse(200,addvideos,"Video added to playlist successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId))
    {
        throw new ApiError(400,"Invalid playlist or video id")
    }

    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)

    if(!playlist)
    {
        throw new ApiError(404,"Playlist not found")
    }

    if(!video)
    {
        throw new ApiError(404,"Video not found")
    }
    if(playlist.owner.toString() !== req.user?._id.toString())
    {
        throw new ApiError(403,"You are not allowed to remove videos from this playlist")
    }


    const removevideo = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull:{
                videos: videoId
            }
        },
        {new:true}
    )

    if(!removevideo)
    {
        throw new ApiError(500,"Failed to remove video from playlist")
    }

    return res.status(200)
    .json(new ApiResponse(200,removevideo,"Video removed from playlist successfully"))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!isValidObjectId(playlistId))
    {
        throw new ApiError(400,"Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist)
    {
        throw new ApiError(404,"Playlist not found")
    }

    if(playlist.owner.toString() !== req.user?._id.toString())
    {
        throw new ApiError(403,"You are not allowed to delete this playlist")
    }
    await Playlist.findByIdAndDelete(playlistId)
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Playlist deleted successfully"
        )
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!name || !description)
    {
        throw new ApiError(400,"Name and description are required")
    }

    if(!isValidObjectId(playlistId))
    {
        throw new ApiError(400,"Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist)
    {
        throw new ApiError(404,"Playlist not found")
    }

    if(playlist.owner.toString()!=req.user?._id.toString())
    {
        throw new ApiError(403,"You are not allowed to update this playlist")
    }

    const updateplaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set:{
                name,
                description
            },
        },
        {new:true}
    )

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            updateplaylist,
            "Playlist updated successfully"
        )
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}