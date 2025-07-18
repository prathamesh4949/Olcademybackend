import mongoose from 'mongoose'

const userSchemea = mongoose.Schema({
   
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true,
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    emailOtp:{
        type:String,
        default:''
    },
    emailOtpExpiry:{
        type:Date
    }

}, {timestamps:true})

export const User = mongoose.models.user || mongoose.model('User', userSchemea)
