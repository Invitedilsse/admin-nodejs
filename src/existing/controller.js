

export const register =async(req, res)=>{
    try{
        return "Hey its existing Register"
    }catch(err){
        console.log("err=====>",err)
    }
}