export default class {

    /**
     * 返回成功
     */
    static OK = 20;

    /**
     * 服务器未知错误
     */
    static ERROR = 40;

    /**
     * 缺少定义的访问信息
     */
    static ERROR_UNAUTHORIZED = 41;

    /**
     * 缺少必填项
     */
    static ERROR_REQUIRED = 42;

    /**
     * 功能没有实现
     */
    static ERROR_UNDEFINED = 44;

    /**
     * 访问不被允许(权限问题)
     */
    static ERROR_NOT_ALLOWED = 45;

    /**
     * 标准业务错误
     */
    static ERROR_UM = 60;
}