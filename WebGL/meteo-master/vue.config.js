module.exports = {
    baseUrl: process.env.NODE_ENV === 'production' ? './' : '/',
    productionSourceMap: false,
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
            '/tiles': {       // 获得二进制流气象数据文件
                target: 'http://116.62.127.54',
                changOrigin: true,
                pathRewrite: {
                    "^/tiles": "/tiles/",
                }
            },
            '/thor': {
                target: 'http://localhost:8080',
                changOrigin: true,
                pathRewrite: {
                    "^/thor": "",
                }
            },
            '/boot-test-standard-ssm': {
                target: 'http://localhost:8080',
                changOrigin: true,
                pathRewrite: {
                    "^/boot-test-standard-ssm": "",
                }
            },
        },
    },
    chainWebpack: config => {
        config.module.rule('glsl')
            .test(/\.glsl$/)
            .use('webpack-glsl-loader')
            .loader('webpack-glsl-loader');
        /*config.module.rule('vue')
            .test(/\.vue$/)
            .use('iview-loader')
            .loader('iview-loader')
            .options({
                prefix: false
            });*/
    }
};
