import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"; 
import { User } from "../models/users.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async(req,res)=>{
    // res.status(200).json({
    //     message: "Everything is Ok, Anjay Sir"
    // })

    // get user details from frontend
    // vaildation - not empty
    // check if user already exist or not : email, username
    // check for image, avatar and upload on cloudinary
    // create user object - create entry in db
    // remove password and access token field from response
    // check for user creation
    // return res

    const {fullName, email, username, password} = req.body;
    console.log("email ", email);

    if([fullName,email,username,password].some((field)=> field?.trim() === "")){
        throw new ApiError(400,"All fields are required")
    }
    
    const existedUser = User.findOne({
        $or:[{ email },{ username }]
    })

    if(existedUser){
        throw new ApiError(409,"User already exists")
    }

   const avatarLocalPath = req.files?.avatar[0]?.path;

   const converImageLocalPath = req.files?.converImage[0]?.path;

   if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
   }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const converImage = await uploadOnCloudinary(converImageLocalPath);
  if(!avatar){
    throw new ApiError(400,"Avatar file is required")
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new ApiError(500,"Something went wrong while registering a user")
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")
  )
})

export {registerUser}