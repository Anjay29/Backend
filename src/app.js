import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({extended: true,limit:'30mb'}))
app.use(express.static("public/temp"))
app.use(cookieParser())

// import route
import userRouter from './routes/user.routes.js'

// routes declaration
app.use("/api/v1/user",userRouter)

export {app}