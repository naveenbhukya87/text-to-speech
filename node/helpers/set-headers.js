// exports.setHeaders = (req,res,next)=>{
//     const period = 0;
//     const STSAge = 31536000;
//     res.set
// }
/**
@description Set required cache-control directives and access control allow origin to response
*/

exports.setHeaders = (req, res, next) => {
    // period in seconds
    const period = 0;
    const STSAge = 31536000;
    res.set("Cache-control", `no-cache, no-store, must-revalidate, max-age=${period}`);
    res.setHeader("Access-Control-Allow-Origin", "*"); //process.env.ORIGIN
    res.setHeader("Strict-Transport-Security", `max - age=${STSAge}; includeSubDomains; preload`);
    res.setHeader("X-Frame-Options", "deny");
    res.setHeader("X-XSS-Protection", "1;mode=block");
    res.set("x-powered-by", false);
    next();
}
