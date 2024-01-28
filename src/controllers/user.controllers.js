import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"; 
import { User } from "../models/users.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userID) => {
  try {
    const user = await User.findById(userID);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.save({validateBeforeSave: false});

    return {accessToken,refreshToken};

  } catch (error) {
    throw new ApiError(500,"Something went wrong");
  }
}

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
    // console.log("email ", email);
    console.log(req.body);

    if([fullName,email,username,password].some((field)=> field?.trim() === "")){
        throw new ApiError(400,"All fields are required")
    }
    
    const existedUser = await User.findOne({
        $or:[{ email },{ username }]
    })

    if(existedUser){
      throw new ApiError(409,"User already exists")
    }
 
   const avatarLocalPath = req.files?.avatar[0]?.path;

  //  const converImageLocalPath = req.files?.coverImage[0]?.path;
  
   let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

   if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
   }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
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

const loginUser = asyncHandler(async(req , res)=>{
    // req body se data le aao
    // username or email
    // find the user
    // password check
    // if password is not correct say invalid password if password is correct generate refresh token and access token
    // send cookie

    const {email,password,username} = req.body;

    if(!(email || username)){
      throw new ApiError(400,"Usename or email is required")
    }

    const user = await User.findOne({
      $or : [{username},{email}]
    })

    if(!user){
      throw new ApiError(404,"User doesn't exist, please login in first");
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
      throw new ApiError(401,"Invalid user credentials");
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
      httpOnly: true,
      secure: true,
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
      new ApiResponse(200,{
        user: loggedInUser, accessToken, refreshToken
      },"User loggedIn Successfully")
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        refreshToken : undefined
      }
    },
    {
      new : true
    }
  )

  const options = {
    httpOnly: true,
    secure: true,
  }

  return res.status(200)
  .clearCookie("refreshToken",options)
  .clearCookie("accessToken",options)
  .json(new ApiResponse(200,{},"User logged Out"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{

  const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
  console.log(req.cookies)

  if(!incomingToken){
    throw new ApiError(401,"unauthorized request");
  }

  try { 
    const decodedToken = jwt.verify(incomingToken,process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401, "Invalid Refresh token")
    }
  
    if(incomingToken !== user?.refreshToken){
      throw new ApiError(401,"Refresh token is expire or used")
    }
  
    const options = {
      httpOnly : true,
      secure : true,
    }
  
    const {newAccessToken,newRefreshToken} = generateAccessAndRefreshToken(user._id)
  
    return res.status(200)
          .cookie("accessToken",newAccessToken,options)
          .cookie("refreshToken", newRefreshToken,options)
          .json(
            new ApiResponse(
              200,
              {
                accessToken: newAccessToken,
                refreshToken : newRefreshToken
              },
              "Access Token Refreshed"
            )
          )
  } catch (error) {
    throw new ApiError(404,error?.message || "Invalid Refresh Token")
  }
})

export {registerUser,loginUser,logoutUser,refreshAccessToken}