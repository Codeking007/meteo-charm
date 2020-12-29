module.exports = {
    baseUrl: process.env.NODE_ENV === 'production' ? './' : '/',
    productionSourceMap: false,
    // devServer:{type:Object} 3个属性host,port,https
    // 它支持webPack-dev-server的所有选项
    devServer: {
        port: 80, // 端口号
        proxy: {
            '/extend-service': {
                // target:"http://localhost:8085",
                target: "http://120.27.234.5",
                changOrigin: true, //开启代理：在本地会创建一个虚拟服务端，然后发送请求的数据，并同时接收请求的数据，这样服务端和服务端进行数据的交互就不会有跨域问题
                pathRequiresRewrite: {
                    "^/extend-service": "/extend-service/",
                }
            },
            '/service-self': {
                // target: 'http://localhost:8088',
                target: 'http://120.27.234.5',
                changOrigin: true, //开启代理：在本地会创建一个虚拟服务端，然后发送请求的数据，并同时接收请求的数据，这样服务端和服务端进行数据的交互就不会有跨域问题
                pathRequiresRewrite: {
                    "^/service-self": "/service-self/",
                }
            },
            '/weather-shh': {
                // target: 'http://localhost:8088',
                target: 'http://120.27.234.5',
                changOrigin: true, //开启代理：在本地会创建一个虚拟服务端，然后发送请求的数据，并同时接收请求的数据，这样服务端和服务端进行数据的交互就不会有跨域问题
                pathRequiresRewrite: {
                    "^/weather-shh": "/weather-shh/",
                }
            },
        },
    },
    chainWebpack: config => {
        config.module.rule('glsl')
            .test(/\.glsl$/)
            .use('webpack-glsl-loader')
            .loader('webpack-glsl-loader');
        /*config.module.rule('css')
            .test(/\.css$/)
            .use(ExtractTextPlugin.extract({
                fallback: 'style-loader',
                use: 'css-loader'
            }))
            .loader('css-loader');*/
        /*config.module.rule('vue')
            .test(/\.vue$/)
            .use('iview-loader')
            .loader('iview-loader')
            .options({
                prefix: false
            })*/
        /*config.module.rule('images')
            .test(/\.(png|jpe?g|gif|svg)(\?.*)?$/)
            .use('url-loader')
            .loader('url-loader')
            .tap(options => Object.assign(options, {limit: 10240}))*/
    }
};
