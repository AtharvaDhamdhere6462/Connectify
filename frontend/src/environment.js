let IS_PROD =true;
const server =IS_PROD ?
    
    "https://connectifybackend-cmof.onrender.com" :
    "https://localhost:3000"


export default server;