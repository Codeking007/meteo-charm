<template>
  <div class="register">
    <div class="register-top">
      <!--<span class="mui-icon mui-icon-arrowleft" @tap="goBack" style="font-size: 15px;">Back</span>-->
      <span class="mui-icon mui-icon-closeempty" @tap="hideRegisterPage()"
            style="font-size: 30px;float:right;"></span>
    </div>
    <div class="register-central mui-scroll-wrapper">
      <div class="mui-scroll">
        <form class="mui-input-group" ref="registerForm" :model="form"
              style="display: initial;background: black;height: 100%;width:100%;font-size: 15px;">
          <div class="register-content-top">
            <div class="register-media" @tap="changeHead">
              <img :src="form.imgUrl" style="width: 100%;height: 100%;position: absolute;"
                   v-if="form.imgUrl">
            </div>
          </div>
          <div class="register-content-central">
            <div class="register-content-con">
              <label><span class="mui-icon mui-icon-contact register-content-con-label"></span></label>
              <input v-model="form.account" type="text" class="mui-input-clear register-content-con-input"
                     @blur="checkUserName"
                     placeholder="account">
            </div>
            <div class="register-content-con margin-top-10">
              <label><span class="mui-icon mui-icon-locked register-content-con-label"></span></label>
              <input v-model="form.password" @change="clearCheckPassword" type="password"
                     class="mui-input-password register-content-con-input" placeholder="password">
            </div>
            <div class="register-content-con margin-top-10">
              <label><span class="mui-icon mui-icon-locked register-content-con-label"></span></label>
              <input v-model="form.checkPassword" @change="checkBothPassword" type="password"
                     class="mui-input-password register-content-con-input" placeholder="confirm">
            </div>
            <div class="register-content-con margin-top-10">
              <label><span class="mui-icon mui-icon-contact register-content-con-label"></span></label>
              <input v-model="form.nickname" type="text"
                     class="mui-input-clear register-content-con-input"
                     placeholder="nick name">
            </div>
            <div class="register-content-con margin-top-10">
              <label><span class="mui-icon mui-icon-email register-content-con-label"></span></label>
              <input v-model="form.email" type="text" class="mui-input-clear"
                     style="width: 50%;font-size: 15px;" placeholder="abc@email.com">
              <!--<button type="button" class="mui-btn " :disabled="waitSeconds > 0" style="width: 20%;top: 3px;color: rgb(243, 78, 14);font-weight: bold" >-->
              <!--send{{waitSeconds === 0 ?'':'('+waitSeconds+')'}}-->
              <!--</button>-->
              <div style="width: 35%;display: inline-block">
                <div
                    style="display:inherit;width: 2px;height: 16px;margin-right:16px;background: rgba(255,255,255,0.4)"></div>
                <span style="color: rgb(243, 78, 14);"
                      @tap="sendEmailVerifyCode">send{{ waitSeconds === 0 ? '' : '(' + waitSeconds + ')' }}</span>
              </div>
              <!--<button type="button" class="mui-btn whiconfont icon-fasongyoujian" :disabled="waitSeconds > 0" style="width: 20%;top: 3px;color: rgb(243, 78, 14);font-weight: bold" @tap="sendEmailVerifyCode">-->
              <!--{{waitSeconds === 0 ?'':'('+waitSeconds+')'}}-->
              <!--</button>-->
            </div>
            <div class="register-content-con margin-top-10">
              <label><span
                  class="mui-icon whiconfont icon-dunpai register-content-con-label"></span></label>
              <input v-model="form.code" type="text" class="mui-input-clear register-content-con-input"
                     placeholder="verification code">
            </div>
            <div class="mui-checkbox register-content-file">

              <div style="width: 80%;">
                <a href="#userSpecification">《用户规范》</a>|<a href="#legalStatementsAndPrivacyPolicies">《法律声明和隐私政策》</a>
              </div>
              <input name="agreed" v-model="form.agreed" type="checkbox"
                     style="width: 3%;font-size: 10px;">
            </div>
            <div class="register-content-bottom-button">
              <button type="button" class="mui-btn mui-btn-primary" @tap="commitRegister">REGISTER
              </button>
            </div>
            <br/><br/>
          </div>
        </form>
      </div>
    </div>
    <div class="register-bottom">
      <div id="userSpecification" class="mui-popover mui-scroll-wrapper"
           style="width:100%;color: black;border-radius: 0px">
        <div style="position: fixed;float: top;right: 5px;z-index: 10">
                    <span class="mui-icon mui-icon-closeempty" style="font-weight: bold;font-size: 30px;"
                          @tap="closePop()"></span>
        </div>
        <div class="mui-scroll" style="padding: 10px 26px">
          <br>
          <h4>一、总则</h4>
          <br>
          <p style="text-align: justify">
            1.1 平台的所有权和运营权归优尼迈特气象科技（上海）有限公司所有。
          </p>
          <p style="text-align: justify">
            1.2
            用户在注册之前，应当仔细阅读本协议，并同意遵守本协议后方可成为注册用户。一旦注册成功，则用户与平台之间自动形成协议关系，用户应当受本协议的约束。用户在使用特殊的服务或产品时，应当同意接受相关协议后方能使用。
          </p>
          <p style="text-align: justify">
            1.3 本协议则可由互动平台随时更新，用户应当及时关注并同意本站不承担通知义务。本站的通知、公告、声明或其它类似内容是本协议的一部分。
          </p>
          <br>
          <h4>
            二、服务内容
          </h4>
          <br>
          <p style="text-align: justify">
            2.1 互动平台的具体内容由本站根据实际情况提供。
          </p>
          <p style="text-align: justify">
            2.2
            本站仅提供相关的网络服务，除此之外与相关网络服务有关的设备(如个人电脑、手机、及其他与接入互联网或移动网有关的装置)及所需的费用(如为接入互联网而支付的电话费及上网费、为使用移动网而支付的手机费)均应由用户自行负担。
          </p>
          <br>
          <h4>
            三、用户帐号
          </h4>
          <br>
          <p style="text-align: justify">
            3.1 经本站注册系统完成注册程序并通过身份认证的用户即成为正式用户，可以获得本站规定用户所应享有的一切权限；未经认证仅享有本站规定的部分会员权限。平台有权对会员的权限设计进行变更。
          </p>
          <p style="text-align: justify">
            3.2
            用户只能按照注册要求使用真实姓名，及身份证号注册。用户有义务保证密码和帐号的安全，用户利用该密码和帐号所进行的一切活动引起的任何损失或损害，由用户自行承担全部责任，本站不承担任何责任。如用户发现帐号遭到未授权的使用或发生其他任何安全问题，应立即修改帐号密码并妥善保管，如有必要，请通知本站。因黑客行为或用户的保管疏忽导致帐号非法使用，本站不承担任何责任。
          </p>

          <br>
          <h4>
            四、使用规则
          </h4>
          <br>
          <p style="text-align: justify">
            4.1
            遵守中华人民共和国相关法律法规，包括但不限于《中华人民共和国计算机信息系统安全保护条例》、《计算机软件保护条例》、《最高人民法院关于审理涉及计算机网络著作权纠纷案件适用法律若干问题的解释(法释[2004]1号)》、《全国人大常委会关于维护互联网安全的决定》、《互联网电子公告服务管理规定》、《互联网新闻信息服务管理规定》、《互联网著作权行政保护办法》和《信息网络传播权保护条例》等有关计算机互联网规定和知识产权的法律和法规、实施办法。
          </p>
          <p style="text-align: justify">
            4.2 用户对其自行发表、上传或传送的内容负全部责任，所有用户不得在本站任何页面发布、转载、传送含有下列内容之一的信息，否则本站有权自行处理并不通知用户：
          </p>
          <p style="text-align: justify">
            (1)违反宪法确定的基本原则的； <br>
            (2)危害国家安全，泄漏国家机密，颠覆国家政权，破坏国家统一的； <br>
            (3)损害国家荣誉和利益的； <br>
            (4)煽动民族仇恨、民族歧视，破坏民族团结的； <br>
            (5)破坏国家宗教政策，宣扬邪教和封建迷信的； <br>
            (6)散布谣言，扰乱社会秩序，破坏社会稳定的； <br>
            (7)散布淫秽、色情、赌博、暴力、恐怖或者教唆犯罪的； <br>
            (8)侮辱或者诽谤他人，侵害他人合法权益的； <br>
            (9)煽动非法集会、结社、游行、示威、聚众扰乱社会秩序的； <br>
            (10)以非法民间组织名义活动的； <br>
            (11)含有法律、行政法规禁止的其他内容的。 <br>
          </p>

          <p style="text-align: justify">
            4.3
            用户承诺对其发表或者上传于本站的所有信息(即属于《中华人民共和国著作权法》规定的作品，包括但不限于文字、图片、音乐、电影、表演和录音录像制品和电脑程序等)均享有完整的知识产权，或者已经得到相关权利人的合法授权；如用户违反本条规定造成本站被第三人索赔的，用户应全额补偿本站一切费用(包括但不限于各种赔偿费、诉讼代理费及为此支出的其它合理费用)；
          </p>

          <p style="text-align: justify">
            4.4
            当第三方认为用户发表或者上传于本站的信息侵犯其权利，并根据《信息网络传播权保护条例》或者相关法律规定向本站发送权利通知书时，用户同意本站可以自行判断决定删除涉嫌侵权信息，除非用户提交书面证据材料排除侵权的可能性，本站将不会自动恢复上述删除的信息;<br>
            (1)不得为任何非法目的而使用网络服务系统；<br>
            (2)遵守所有与网络服务有关的网络协议、规定和程序； <br>
            (3)不得利用本站进行任何可能对互联网的正常运转造成不利影响的行为；<br>
            (4)不得利用本站进行任何不利于本站的行为。 <br>
          </p>

          <p style="text-align: justify">
            4.5 如用户在使用网络服务时违反上述任何规定，本站有权要求用户改正或直接采取一切必要的措施(包括但不限于删除用户张贴的内容、暂停或终止用户使用网络服务的权利)以减轻用户不当行为而造成的影响。
          </p>
          <br>
          <h4>
            五、隐私保护
          </h4>
          <br>
          <p style="text-align: justify">
            5.1 本站不对外公开或向第三方提供单个用户的注册资料及用户在使用网络服务时存储在本站的非公开内容，但下列情况除外：<br>
            (1)事先获得用户的明确授权；<br>
            (2)根据有关的法律法规要求；<br>
            (3)按照相关政府主管部门的要求；<br>
            (4)为维护社会公众的利益。
          </p>
          <p style="text-align: justify">
            5.2 本站可能会与第三方合作向用户提供相关的网络服务，在此情况下，如该第三方同意承担与本站同等的保护用户隐私的责任，则本站有权将用户的注册资料等提供给该第三方。
          </p>
          <p style="text-align: justify">
            5.3 在不透露单个用户隐私资料的前提下，本站有权对整个用户数据库进行分析并对用户数据库进行商业上的利用。<br>
          </p>
          <br>
          <h4>
            六、版权声明
          </h4>
          <br>
          <p style="text-align: justify">
            6.1 本站的文字、图片、音频、视频等版权均归永兴元科技有限公司享有或与作者共同享有，未经本站许可，不得任意转载。
          </p>
          <p style="text-align: justify">
            6.2 本站特有的标识、版面设计、编排方式等版权均属永兴元科技有限公司享有，未经本站许可，不得任意复制或转载。
          </p>
          <p style="text-align: justify">
            6.3 使用本站的任何内容均应注明“来源于互动平台”及署上作者姓名，按法律规定需要支付稿酬的，应当通知本站及作者及支付稿酬，并独立承担一切法律责任。
          </p>
          <p style="text-align: justify">
            6.4 本站享有所有作品用于其它用途的优先权，包括但不限于网站、电子杂志、平面出版等，但在使用前会通知作者，并按同行业的标准支付稿酬。
          </p>
          <p style="text-align: justify">
            6.5 本站所有内容仅代表作者自己的立场和观点，与本站无关，由作者本人承担一切法律责任。
          </p>
          <p style="text-align: justify">
            6.6 恶意转载本站内容的，本站保留将其诉诸法律的权利。
          </p>

          <br>
          <h4>
            七、责任声明
          </h4>
          <br>
          <p style="text-align: justify">
            7.1 用户明确同意其使用本站网络服务所存在的风险及一切后果将完全由用户本人承担，互动平台对此不承担任何责任。
          </p>
          <p style="text-align: justify">
            7.2 本站无法保证网络服务一定能满足用户的要求，也不保证网络服务的及时性、安全性、准确性。
          </p>
          <p style="text-align: justify">
            7.3 本站不保证为方便用户而设置的外部链接的准确性和完整性，同时，对于该等外部链接指向的不由本站实际控制的任何网页上的内容，本站不承担任何责任。
          </p>
          <p style="text-align: justify">
            7.4 对于因不可抗力或本站不能控制的原因造成的网络服务中断或其它缺陷，本站不承担任何责任，但将尽力减少因此而给用户造成的损失和影响。
          </p>
          <p style="text-align: justify">
            7.5 对于站向用户提供的下列产品或者服务的质量缺陷本身及其引发的任何损失，本站无需承担任何责任：
          </p>
          <p style="text-align: justify">
            (1)本站向用户免费提供的各项网络服务；<br>
            (2)本站向用户赠送的任何产品或者服务。
          </p>
          <p style="text-align: justify">
            7.6 本站有权于任何时间暂时或永久修改或终止本服务(或其任何部分)，而无论其通知与否，本站对用户和任何第三人均无需承担任何责任。
          </p>

          <br>
          <h4>
            八、附则
          </h4>
          <br>
          <p style="text-align: justify">
            8.1 本协议的订立、执行和解释及争议的解决均应适用中华人民共和国法律。
          </p>
          <p style="text-align: justify">
            8.2 如本协议中的任何条款无论因何种原因完全或部分无效或不具有执行力，本协议的其余条款仍应有效并且有约束力。
          </p>
          <p style="text-align: justify">
          <p style="text-align: justify">
            8.3 本协议解释权及修订权归优尼迈特气象科技有限公司所有。
          </p>

        </div>
      </div>
      <div id="legalStatementsAndPrivacyPolicies" class="mui-popover mui-scroll-wrapper"
           style="width:100%;color: black;border-radius: 0px">
        <div style="position: fixed;float: top;right: 5px;z-index: 10">
                    <span class="mui-icon mui-icon-closeempty" style="font-weight: bold;font-size: 30px"
                          @tap="closePop()"></span>
        </div>
        <div class="mui-scroll" style="padding: 10px 26px">
          <br>
          <h4>
            最近更新日期：2018年06月14日
          </h4>
          <br>
          <h4>
            提示条款
          </h4>
          <br>
          <p style="text-indent: 2em">
            您的信任对我们非常重要，我们深知个人信息对您的重要性，我们将按法律法规要求，采取相应安全保护措施，尽力保护您的个人信息安全可控。鉴此，优尼迈特气象科技（上海）有限公司服务提供者（或简称“我们”）制定本《法律声明及隐私权政策》（下称“本政策
            /本隐私权政策”）并提醒您：
          </p>
          <p style="text-indent: 2em">
            在使用优尼迈特气象科技（上海）有限公司各项产品或服务前，请您务必仔细阅读并透彻理解本政策，在确认充分理解并同意后使用相关产品或服务。一旦您开始使用优尼迈特气象科技（上海）有限公司各项产品或服务，即表示您已充分理解并同意本政策。如对本政策内容有任何疑问、意见或建议，您可通过优尼迈特气象科技（上海）有限公司提供的各种联系方式（http://www.meteochina.com）与我们联系。
          </p>
          <p style="text-indent: 2em">
            本政策适用于优尼迈特气象科技（上海）有限公司产品或服务。如我们关联公司（范围详见定义部分）的产品或服务中使用了优尼迈特气象科技（上海）有限公司提供的产品或服务（例如直接使用账户登录）但未设独立法律声明及隐私权政策的，则本政策同样适用于该部分产品或服务。<br>
          </p>
          <br>
          <h4>
            第一部分 定义
          </h4>
          <br>
          <p style="text-indent: 2em;text-align:justify">
            优尼迈特气象科技（上海）有限公司：指优尼迈特气象科技（上海）有限公司（域名meteochina.com）网站及客户端。<br>
            关联公司：指优尼迈特气象科技（上海）有限公司。<br>
            个人信息：指以电子或者其他方式记录的能够单独或者与其他信息结合识别特定自然人身份或者反映特定自然人活动情况的各种信息。<br>
            个人敏感信息：包括身份证件号码、个人生物识别信息、银行账号、财产信息、行踪轨迹、交易信息、14岁以下（含）儿童的个人信息等。<br>
            个人信息删除：指在实现日常业务功能所涉及的系统中去除个人信息的行为，使其保持不可被检索、访问的状态。<br>
          </p>
          <br>
          <h4>
            第二部分 法律声明
          </h4>
          <br>
          <h5>
            权利归属
          </h5>
          <p style="text-align: justify;text-indent: 2em">
            除非优尼迈特气象科技（上海）有限公司另行声明，优尼迈特气象科技（上海）有限公司网站内的所有产品、技术、软件、程序、数据及其他信息（包括文字、图标、图片、照片、音频、视频、图表、色彩组合、版面设计等）的所有权利（包括版权、商标权、专利权、商业秘密及其他相关权利）均归优尼迈特气象科技（上海）有限公司所有。未经优尼迈特气象科技（上海）有限公司许可，任何人不得以包括通过机器人、蜘蛛等程序或设备监视、复制、传播、展示、镜像、上载、下载等方式擅自使用优尼迈特气象科技（上海）有限公司内的任何内容。
          </p>
          <p style="text-align: justify;text-indent: 2em">
            优尼迈特气象科技（上海）有限公司网站上文字及/或标识，以及其他标识、徽记、产品和服务名称均为优尼迈特气象科技（上海）有限公司在中国和其他国家的商标，如有宣传、展示等任何使用需要，您必须取得优尼迈特气象科技（上海）有限公司事先书面授权。
          </p>
          <h5>
            责任限制
          </h5>
          <p style="text-align: justify;text-indent: 2em">
            优尼迈特气象科技（上海）有限公司转载的作品（包括论坛内容）出于传递更多信息之目的，并不意味我们赞同其观点或已经证实其内容的真实性。
          </p>
          <h5>
            知识产权保护
          </h5>
          <p style="text-align: justify;text-indent: 2em">
            我们尊重知识产权，反对并打击侵犯知识产权的行为。知识产权权利人若认为优尼迈特气象科技（上海）有限公司内容侵犯其合法权益的，可以通过网站（http://www.meteochina.com/）进行投诉，我们将在收到知识产权权利人合格通知后依据相应的法律法规以及平台规则及时处理。<br>
          </p>
          <br>
          <h4>
            第三部分 隐私权政策
          </h4>
          <br>
          <p>
            本隐私权政策部分将帮助您了解以下内容：
          </p>
          <p>
            1、我们如何收集和使用您的个人信息;<br>
            2、我们如何使用 Cookie 和同类技术;<br>
            3、我们如何共享、转让、公开披露您的个人信息;<br>
            4、我们如何保护您的个人信息;<br>
            5、您如何管理您的个人信息; <br>
            6、我们如何处理未成年人的个人信息; <br>
            7、您的个人信息如何在全球范围转移; <br>
            8、本隐私权政策如何更新;<br>
            9、如何联系我们; <br>
          </p>

          <p style="text-align: justify">
            一、我们如何收集和使用您的信息
          </p>
          <p style="text-indent: 2em;text-align: justify">
            我们会出于本政策所述的以下目的，收集和使用您的个人信息：
          </p>
          <p>
            （一）帮助您成为我们的会员
          </p>
          <p style="text-align: justify;text-indent: 2em">
            为成为我们的会员，以便我们为您提供会员服务，您需要提供手机号码、电子邮箱地址，并创建用户名和密码。如果您仅需使用浏览、搜索等基本服务，您不需要注册成为我们的会员及提供上述信息。
          </p>
          <p style="text-align: justify;text-indent: 2em">
            在注册会员过程中，如果您提供以下额外信息补全个人资料，将有助于我们给您提供如会员生日特权等更个性化的会员服务：您的真实姓名、性别、出生年月日、居住地、您本人的真实头像。但如果您不提供这些信息，将会影响到您使用个性化的会员服务，但不会影响使用优尼迈特气象科技（上海）有限公司产品或服务的基本浏览、搜索、购买功能。<br>
          </p>
          <p style="text-align: justify;text-indent: 2em">
            在您主动注销账号时，我们将根据适用法律法规的要求尽快使其匿名或删除您的个人信息。
          </p>
          <p>
            （二）为您展示和推送商品或服务
          </p>
          <p style="text-align: justify;text-indent: 2em">
            为改善我们的产品或服务、向您提供个性化的信息搜索及交易服务，我们会根据您的浏览及搜索记录、设备信息、位置信息、订单信息，提取您的浏览、搜索偏好、行为习惯、位置信息等特征，基于特征标签进行间接人群画像并展示、推送信息。
          </p>
          <p style="text-align: justify;text-indent: 2em">
            如果您不想接受我们给您发送的商业广告，您可随时通过相应产品退订功能取消。
          </p>
          <p>
            （三）向您提供商品或服务
          </p>
          <p>
            1、您向我们提供的信息<br>

          </p>
          <p style="text-align: justify;text-indent: 2em">
            为便于向您交付商品或服务，您需提供收货人姓名、收货地址、邮政编码、收货人联系电话。如果我们委托第三方向您交付时，我们会在征得您同意后将上述信息共享给第三方。如果您拒绝提供此类信息，我们将无法完成相关交付服务。
          </p>
          <p>
            2、我们在您使用服务过程中收集的信息
          </p>
          <p style="text-align: justify;text-indent: 2em">
            为向您提供更契合您需求的页面展示和搜索结果、了解产品适配性、识别账号异常状态，我们会收集关于您使用的服务以及使用方式的信息并将这些信息进行关联，这些信息包括：
          </p>
          <p style="text-align: justify">
            设备信息：我们会根据您在软件安装及使用中授予的具体权限，接收并记录您所使用的设备相关信息（例如设备型号、操作系统版本、设备设置、唯一设备标识符等软硬件特征信息）、设备所在位置相关信息（例如IP
            地址、GPS位置以及能够提供相关信息的WLAN接入点、蓝牙和基站等传感器信息）。
          </p>
          <p style="text-align: justify">
            日志信息：当您使用我们的网站或客户端提供的产品或服务时，我们会自动收集您对我们服务的详细使用情况，作为有关网络日志保存。例如您的搜索查询内容、IP地址、浏览器的类型、电信运营商、使用的语言、访问日期和时间及您访问的网页记录等。
          </p>
          <p style="text-align: justify;text-indent: 2em">
            请注意，单独的设备信息、日志信息等是无法识别特定自然人身份的信息。如果我们将这类非个人信息与其他信息结合用于识别特定自然人身份，或者将其与个人信息结合使用，则在结合使用期间，这类非个人信息将被视为个人信息，除取得您授权或法律法规另有规定外，我们会将该类个人信息做匿名化、去标识化处理。
          </p>
          <p style="text-align: justify;text-indent: 2em">
            为展示您账户的订单信息，我们会收集您在使用我们服务过程中产生的订单信息用于向您展示及便于您对订单进行管理。
          </p>
          <p style="text-align: justify;text-indent: 2em">
            当您与我们联系时，我们可能会保存您的通信/通话记录和内容或您留下的联系方式等信息，以便与您联系或帮助您解决问题，或记录相关问题的处理方案及结果。
          </p>
          <p>
            3、我们通过间接获得方式收集到的您的个人信息
          </p>
          <p style="text-align: justify;text-indent: 2em">
            当您通过我们产品或服务使用上述服务时，您授权我们根据实际业务及合作需要从我们关联公司处接收、汇总、分析我们确认其来源合法或您授权同意其向我们提供的您的个人信息或交易信息。
            如您拒绝提供上述信息或拒绝授权，可能无法使用我们关联公司的相应产品或服务，或者无法展示相关信息，但不影响使用优尼迈特气象科技（上海）有限公司浏览、搜索、交易等核心服务。
          </p>
          <p style="text-align: justify;text-indent: 2em">
            为提高您使用我们及我们关联公司、合作伙伴提供服务的安全性，保护您或其他用户或公众的人身财产安全免遭侵害，更好地预防钓鱼网站、欺诈、网络漏洞、计算机病毒、网络攻击、网络侵入等安全风险，更准确地识别违反法律法规或优尼迈特气象科技（上海）有限公司相关协议规则的情况，我们可能使用或整合您的会员信息、交易信息、设备信息、有关网络日志以及我们关联公司、合作伙伴取得您授权或依据法律共享的信息，来综合判断您账户及交易风险、进行身份验证、检测及防范安全事件，并依法采取必要的记录、审计、分析、处置措施。
          </p>
          <p>
            （五）其他用途
          </p>
          <p style="text-indent: 2em;text-align: justify">
            我们将信息用于本政策未载明的其他用途，或者将基于特定目的收集而来的信息用于其他目的时，会事先征求您的同意。
          </p>
          <p>
            （六）征得授权同意的例外
          </p>
          <p style="text-indent: 2em;text-align: justify">
            根据相关法律法规规定，以下情形中收集您的个人信息无需征得您的授权同意：
          </p>
          <p style="text-align: justify">
            1、与国家安全、国防安全有关的；<br>
            2、与公共安全、公共卫生、重大公共利益有关的； <br>
            3、与犯罪侦查、起诉、审判和判决执行等有关的； <br>
            4、出于维护个人信息主体或其他个人的生命、财产等重大合法权益但又很难得到您本人同意的；<br>
            5、所收集的个人信息是您自行向社会公众公开的； <br>
            6、从合法公开披露的信息中收集个人信息的，如合法的新闻报道、政府信息公开等渠道； <br>
            7、根据您的要求签订合同所必需的； <br>
            8、用于维护所提供的产品或服务的安全稳定运行所必需的，例如发现、处置产品或服务的故障；<br>
            9、为合法的新闻报道所必需的； <br>
            10、学术研究机构基于公共利益开展统计或学术研究所必要，且对外提供学术研究或描述的结果时，对结果中所包含的个人信息进行去标识化处理的； <br>
            11、法律法规规定的其他情形。
          </p>
          <p style="text-indent: 2em;text-align: justify">
            如我们停止运营优尼迈特气象科技（上海）有限公司产品或服务，我们将及时停止继续收集您个人信息的活动，将停止运营的通知以逐一送达或公告的形式通知您，对所持有的个人信息进行删除或匿名化处理。
          </p>
          <br>
          <h4>
            二、我们如何使用 Cookie 和同类技术
          </h4>
          <br>
          <p>
            （一）Cookie
          </p>
          <p style="text-align: justify;text-indent: 2em">
            为确保网站正常运转、为您获得更轻松的访问体验、向您推荐您可能感兴趣的内容，我们会在您的计算机或移动设备上存储名为Cookie 的小数据文件。Cookie
            通常包含标识符、站点名称以及一些号码和字符。借助于 Cookie，网站能够存储您的偏好或购物篮内的商品等数据。
          </p>
          <p style="text-align: justify;text-indent: 2em">
            您可根据自己的偏好管理或删除 Cookie。有关详情，请参见 AboutCookies.org。您可以清除计算机上保存的所有 Cookie，大部分网络浏览器都设有阻止
            Cookie的功能。但如果您这么做，则需要在每一次访问我们的网站时更改用户设置。如需详细了解如何更改浏览器设置，请访问您使用的浏览器的相关设置页面。
          </p>
          <p>
            （二）网站信标和像素标签
          </p>
          <p style="text-align: justify;text-indent: 2em">
            除
            Cookie外，我们还会在网站上使用网站信标和像素标签等其他同类技术。例如，我们向您发送的电子邮件可能含有链接至我们网站内容的地址链接，如果您点击该链接，我们则会跟踪此次点击，帮助我们了解您的产品或服务偏好以便于我们主动改善客户服务体验。网站信标通常是一种嵌入到网站或电子邮件中的透明图像。借助于电子邮件中的像素标签，我们能够获知电子邮件是否被打开。如果您不希望自己的活动以这种方式被追踪，则可以随时从我们的寄信名单中退订。
          </p>
          <br>
          <h4>
            三、我们如何共享、转让、公开披露您的个人信息
          </h4>
          <br>
          <p>
            （一）共享
          </p>
          <p style="text-align: justify;text-indent: 2em">
            我们不会与优尼迈特气象科技（上海）有限公司服务提供者以外的公司、组织和个人共享您的个人信息，但以下情况除外：
          </p>
          <p style="text-align: justify;">
            1、在获取明确同意的情况下共享：获得您的明确同意后，我们会与其他方共享您的个人信息。<br>
            2、在法定情形下的共享：我们可能会根据法律法规规定、诉讼争议解决需要，或按行政、司法机关依法提出的要求，对外共享您的个人信息。 <br>
          </p>
          <p>
            （二）转让
          </p>
          <p style="text-align: justify;text-indent: 2em">
            我们不会将您的个人信息转让给任何公司、组织和个人，但以下情况除外：
          </p>
          <p style="text-align: justify">
            1、在获取明确同意的情况下转让：获得您的明确同意后，我们会向其他方转让您的个人信息； <br>
            2、在优尼迈特气象科技（上海）有限公司提供者发生合并、收购或破产清算情形，或其他涉及合并、收购或破产清算情形时，如涉及到个人信息转让，我们会要求新的持有您个人信息的公司、组织继续受本政策的约束，否则我们将要求该公司、组织和个人重新向您征求授权同意。
          </p>
          <p>
            （三）公开披露
          </p>
          <p style="text-align: justify;text-indent: 2em">
            我们仅会在以下情况下，公开披露您的个人信息：
          </p>
          <p style="text-align: justify">
            1、获得您明确同意或基于您的主动选择，我们可能会公开披露您的个人信息；
          </p>
          <p>
            （四）共享、转让、公开披露个人信息时事先征得授权同意的例外
          </p>
          <p style="text-align: justify;text-indent: 2em">
            以下情形中，共享、转让、公开披露您的个人信息无需事先征得您的授权同意：
          </p>
          <p style="text-align: justify">
            1、与国家安全、国防安全有关的； <br>
            2、与公共安全、公共卫生、重大公共利益有关的； <br>
            3、与犯罪侦查、起诉、审判和判决执行等有关的；<br>
            4、出于维护您或其他个人的生命、财产等重大合法权益但又很难得到本人同意的； <br>
            5、您自行向社会公众公开的个人信息； <br>
            6、从合法公开披露的信息中收集个人信息的，如合法的新闻报道、政府信息公开等渠道。
          </p>
          <p style="text-align: justify;text-indent: 2em">
            根据法律规定，共享、转让经去标识化处理的个人信息，且确保数据接收方无法复原并重新识别个人信息主体的，不属于个人信息的对外共享、转让及公开披露行为，对此类数据的保存及处理将无需另行向您通知并征得您的同意。
          </p>
          <br>
          <h4>
            四、我们如何保护您的个人信息安全
          </h4>
          <br>
          <p style="text-align: justify">
            （一）我们有行业先进的以数据为核心，围绕数据生命周期进行的数据安全管理体系，从组织建设、制度设计、人员管理、产品技术等方面多维度提升整个系统的安全性。
          </p>
          <p style="text-align: justify">
            （二）我们只会在达成本政策所述目的所需的期限内或法律要求的期限内保留您的个人信息，除非延长保留期征得您的同意或受到法律的允许。
          </p>
          <p style="text-align: justify">
            （三）互联网并非绝对安全的环境，我们强烈建议您不要使用非网站推荐的通信方式发送个人信息。您可以通过我们的服务建立联系和相互分享。当您通过我们的服务创建交流、交易或分享时，您可以自主选择沟通、交易或分享的对象，作为能够看到您的交易内容、联络方式、交流信息或分享内容等相关信息的第三方。
          </p>
          <p style="text-align: justify">
            （四）在使用优尼迈特气象科技（上海）有限公司服务进行网上交易时，您不可避免地要向交易对方或潜在的交易对方披露自己的个人信息，如联络方式或联系地址。请您妥善保护自己的个人信息，仅在必要的情形下向他人提供。如您发现自己的个人信息尤其是您的账户或密码发生泄露，请您立即联络优尼迈特气象科技（上海）有限公司，以便我们根据您的申请采取相应措施。
          </p>
          <p style="text-align: justify;text-indent: 2em">
            请使用复杂密码，协助我们保证您的账号安全。我们将尽力保障您发送给我们的任何信息的安全性。如果我们的物理、技术或管理防护设施遭到破坏，导致信息被非授权访问、公开披露、篡改或毁坏，导致您的合法权益受损，我们将承担相应的法律责任。
          </p>
          <p style="text-align: justify">
            （五）我们将不定期更新并公开安全风险、个人信息安全影响评估报告等有关内容，您可通过优尼迈特气象科技（上海）有限公司公告方式获得。
          </p>
          <p style="text-align: justify">
            （六）在不幸发生个人信息安全事件后，我们将按照法律法规的要求向您告知：安全事件的基本情况和可能的影响、我们已采取或将要采取的处置措施、您可自主防范和降低风险的建议、对您的补救措施等。事件相关情况我们将以邮件、信函、电话、推送通知等方式告知您，难以逐一告知个人信息主体时，我们会采取合理、有效的方式发布公告。
            同时，我们还将按照监管部门要求，上报个人信息安全事件的处置情况。
          </p>
          <br>
          <h4>
            五、您如何管理您的个人信息
          </h4>
          <br>
          <p style="text-align: justify;text-indent: 2em">
            您可以通过以下方式访问及管理您的个人信息：
          </p>
          <p style="text-align: justify">
            （一）访问您的个人信息
          </p>
          <p style="text-align: justify;text-indent: 2em">
            您有权访问您的个人信息，法律法规规定的例外情况除外。您可以通过以下方式自行访问您的个人信息：账户信息——如果您希望访问或编辑您的账户中的个人基本资料信息和支付信息、更改您的密码、添加安全信息或关闭您的账户等，您可以通过登录账号通过“账号管理”执行此类操作。对于您在使用我们的产品或服务过程中产生的其他个人信息，我们将根据本条“（七）响应您的上述请求”中的相关安排向您提供。
          </p>
          <p style="text-align: justify">
            （二）更正或补充您的个人信息
          </p>
          <p style="text-align: justify;text-indent: 2em">
            当您发现我们处理的关于您的个人信息有错误时，您有权要求我们做出更正或补充。您可以通过“（一）访问您的个人信息”中列明的方式提出更正或补充申请。
          </p>
          <p style="text-align: justify">
            （三）删除您的个人信息
          </p>
          <p style="text-align: justify;text-indent: 2em">
            您可以通过“（一）访问您的个人信息”中列明的方式删除您的部分个人信息。在以下情形中，您可以向我们提出删除个人信息的请求：
          </p>
          <p style="text-align: justify">
            1、如果我们处理个人信息的行为违反法律法规；<br>
            2、如果我们收集、使用您的个人信息，却未征得您的明确同意； <br>
            3、如果我们处理个人信息的行为严重违反了与您的约定； <br>
            4、如果您不再使用我们的产品或服务，或您主动注销了账号；<br>
            5、如果我们永久不再为您提供产品或服务。 <br>
          </p>
          <p style="text-align: justify;text-indent: 2em">
            若我们决定响应您的删除请求，我们还将同时尽可能通知从我们处获得您的个人信息的主体，要求其及时删除，除非法律法规另有规定，或这些主体获得您的独立授权。当您从我们的服务中删除信息后，我们可能不会立即从备份系统中删除相应的信息，但会在备份更新时删除这些信息。
          </p>
          <p style="text-align: justify">
            （四）改变您授权同意的范围
          </p>
          <p style="text-align: justify;text-indent: 2em">
            当您收回同意后，我们将不再处理相应的个人信息。但您收回同意的决定，不会影响此前基于您的授权而开展的个人信息处理。
          </p>
          <p style="text-align: justify">
            （五）个人信息主体注销账户
          </p>
          <p style="text-align: justify;text-indent: 2em">
            在您主动注销账户之后，我们将停止为您提供产品或服务，根据适用法律的要求删除您的个人信息，或使其匿名化处理。
          </p>
          <p style="text-align: justify">
            （六）约束信息系统自动决策
          </p>
          <p style="text-align: justify;text-indent: 2em">
            在某些业务功能中，我们可能仅依据信息系统、算法等在内的非人工自动决策机制做出决定。如果这些决定显著影响您的合法权益，您有权要求我们做出解释，我们也将在不侵害优尼迈特气象科技（上海）有限公司商业秘密或其他用户权益、社会公共利益的前提下提供申诉方法。
          </p>
          <p style="text-align: justify">
            （七）响应您的上述请求
          </p>
          <p style="text-align: justify;text-indent: 2em">
            为保障安全，您可能需要提供书面请求，或以其他方式证明您的身份。我们可能会先要求您验证自己的身份，然后再处理您的请求。对于您合理的请求，我们原则上不收取费用，但对多次重复、超出合理限度的请求，我们将视情收取一定成本费用。对于那些无端重复、需要过多技术手段（例如，需要开发新系统或从根本上改变现行惯例）、给他人合法权益带来风险或者非常不切实际的请求，我们可能会予以拒绝。
          </p>
          <p style="text-align: justify;text-indent: 2em">
            在以下情形中，按照法律法规要求，我们将无法响应您的请求：
          </p>
          <p style="text-align: justify;">
            1、与国家安全、国防安全有关的； <br>
            2、与公共安全、公共卫生、重大公共利益有关的； <br>
            3、与犯罪侦查、起诉、审判和执行判决等有关的； <br>
            4、有充分证据表明个人信息主体存在主观恶意或滥用权利的；<br>
            5、响应您的请求将导致您或其他个人、组织的合法权益受到严重损害的； <br>
            6、涉及商业秘密的。
          </p>
          <br>
          <h4>
            六、我们如何处理未成年人的个人信息
          </h4>
          <br>
          <p style="text-align: justify;text-indent: 2em">
            如果没有父母或监护人的同意，未成年人不得创建自己的用户账户。如您为未成年人的，建议您请您的父母或监护人仔细阅读本隐私权政策，并在征得您的父母或监护人同意的前提下使用我们的服务或向我们提供信息。
          </p>
          <p style="text-align: justify;text-indent: 2em">
            对于经父母或监护人同意使用我们的产品或服务而收集未成年人个人信息的情况，我们只会在法律法规允许、父母或监护人明确同意或者保护未成年人所必要的情况下使用、共享、转让或披露此信息。
          </p>
          <br>
          <h4>
            七、您的个人信息如何在全球范围转移
          </h4>
          <br>
          <p style="text-align: justify;text-indent: 2em">
            我们在中华人民共和国境内运营中收集和产生的个人信息，存储在中国境内，以下情形除外：
          </p>
          <p style="text-align: justify">
            1、法律法规有明确规定； <br>
            2、获得您的明确授权； <br>
            3、您通过互联网进行跨境交易等个人主动行为。
          </p>
          <p style="text-align: justify;text-indent: 2em">
            针对以上情形，我们会确保依据本隐私权政策对您的个人信息提供足够的保护。
          </p>
          <br>
          <h4>
            八、本隐私权政策如何更新
          </h4>
          <br>
          <p style="text-align: justify;text-indent: 2em">
            我们的隐私权政策可能变更。未经您明确同意，我们不会限制您按照本隐私权政策所应享有的权利。对于重大变更，我们还会提供更为显著的通知（包括我们会通过公示的方式进行通知甚至向您提供弹窗提示）。
          </p>
          <p style="text-align: justify;text-indent: 2em">
            本政策所指的重大变更包括但不限于：
          </p>
          <p style="text-align: justify">
            1、我们的服务模式发生重大变化。如处理个人信息的目的、处理的个人信息类型、个人信息的使用方式等； <br>
            2、我们在控制权等方面发生重大变化。如并购重组等引起的所有者变更等；<br>
            3、个人信息共享、转让或公开披露的主要对象发生变化； <br>
            4、您参与个人信息处理方面的权利及其行使方式发生重大变化； <br>
            5、我们负责处理个人信息安全的责任部门、联络方式及投诉渠道发生变化时；<br>
            6、个人信息安全影响评估报告表明存在高风险时。 <br>
          </p>
          <br>
          <h4>
            九、如何联系我们
          </h4>
          <br>
          <p style="text-align: justify;text-indent: 2em">
            您可以通过以下方式与我们联系，我们将在15天内回复您的请求：<br>
            1、如对本政策内容有任何疑问、意见或建议，您可通过优尼迈特气象科技（上海）有限公司服务中心在线客服与我们联系。<br>
          </p>

        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import service from "../service";

declare let plus: any;
export default Vue.extend({
  props: {
    showRegisterPage: {
      type: Boolean,
      default: true
    }
  },
  created() {

  },
  mounted() {
    this.$mui('.mui-scroll-wrapper').scroll({
      scrollY: true, //是否竖向滚动
      scrollX: false, //是否横向滚动
      startX: 0, //初始化时滚动至x
      startY: 0, //初始化时滚动至y
      indicators: false, //是否显示滚动条
      deceleration: 0.0006, //阻尼系数,系数越小滑动越灵敏
      bounce: true //是否启用回弹
    });
  },
  data() {
    return {
      form: {
        verifySessionKey: '',
        imgUrl: '',
        account: '',
        password: '',
        checkPassword: '',
        nickname: '',
        email: '',
        code: '',
        agreed: false,
      },
      waitSeconds: 0,
      interval: null,
      rules: {
        account: [
          {required: true, message: '账号不能为空', trigger: 'blur'}
        ],
        password: [
          {required: true, message: '密码不能为空', trigger: 'blur'}
        ]
      }
    };
  },
  methods: {
    checkUserName() {
      if (this.showRegisterPage) {
        if (this.form.account === "") {
          this.$mui.alert("账号不能为空", "提示", "确定", null);
          return
        }
        service.user.checkAccount({name: this.form.account}).then(data => {
          if (data === true) {
            this.$mui.alert("账号已被使用", "提示", "确定", null);
          }
        })
      }
    },
    goBack() {
      this.$router.back();
    },
    hideRegisterPage() {
      this.$emit("hideRegisterPage");
    },
    clearCheckPassword() {
      this.form.checkPassword = "";
    },
    checkBothPassword() {
      if (this.form.password === this.form.checkPassword) {
        return true;
      } else {
        this.$mui.alert("两次输入的密码不一致", "提示", "确定", null);
        return false;
      }
    },
    // 生成 32 位 guid
    guid32() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      }).replace(/-/g, "");
    },
    clearRegisterSendInterval() {
      clearInterval(this.interval);
    },
    // 发送邮件验证码
    sendEmailVerifyCode() {
      if (this.waitSeconds > 0) {
        return;
      }
      this.waitSeconds = 60;
      this.form.verifySessionKey = this.guid32();
      this.interval = setInterval(() => {
        if (this.waitSeconds > 0) {
          this.waitSeconds--;
        } else {
          this.clearRegisterSendInterval();
        }
      }, 1000);
      service.security.sendMailCode(this.form.verifySessionKey, this.form.email, 0).then(data => {
        this.$mui.toast(data.message, {duration: 'long', type: 'div'});
      }).catch(reason => {
        this.$mui.toast(reason, {duration: 'long', type: 'div'});
        this.waitSeconds = 0;
      });
    },
    commitRegister() {
      // todo:验证
      if (!(this.form.account && this.form.account !== "")) {
        this.$mui.alert("请输入用户名", "提示", "确定", null);
      } else if (!(this.form.password && this.form.password !== "")) {
        this.$mui.alert("请输入密码", "提示", "确定", null);
      } else if (!(this.form.checkPassword && this.form.checkPassword !== "")) {
        this.$mui.alert("请输入确认密码", "提示", "确定", null);
      } else if (!this.checkBothPassword()) {

      } else if (!(this.form.nickname && this.form.nickname !== "")) {
        this.$mui.alert("请输入用户昵称", "提示", "确定", null);
      } else if (!(this.form.email && this.form.email !== "")) {
        this.$mui.alert("请输入电子邮件", "提示", "确定", null);
      } else if (!(this.form.code && this.form.code !== "")) {
        this.$mui.alert("请输入验证码", "提示", "确定", null);
      } else if (!this.form.agreed) {
        this.$mui.alert("请阅读并同意用户规范及法律声明和隐私政策！", "提示", "确定", null);
      } else {
        service.security.register(this.form).then((data) => {
          this.$mui.alert("注册成功", "提示", "确定", null);
          // this.$router.push({path: "/login"})
          this.hideRegisterPage();
        }).catch(reason => {
          this.$mui.alert(reason, "提示", "确定", null);
        });
      }
    },
    readPlusImgFile(file) {
      let fileReader = new plus.io.FileReader();
      fileReader.onloadend = (data: any) => {
        this.form.imgUrl = data.target.result;
      };
      fileReader.readAsDataURL(file);
    },
    changeHead() {
      plus.gallery.pick((e) => {
        // console.log(e);
        plus.io.resolveLocalFileSystemURL(e, (entry) => {
          entry.file((file) => {
            if (file.size / 1024 / 1024 > 2) {
              this.$mui.toast("请选择尺寸小于2M的文件!");
              return;
            }
            this.readPlusImgFile(file)
          });
        });
      }, function (e) {
      }, {filter: "image", multiple: false});
    },

    /**
     * 功能：关闭条款
     */
    closePop() {
      this.$mui('#userSpecification').popover('hide');
      this.$mui('#legalStatementsAndPrivacyPolicies').popover('hide');
    }
  }
});
</script>

<style lang="less" scoped>
.register {
  background: -webkit-linear-gradient(#4f586c, #2e354a);
  width: 100%;
  height: 100%;
  color: white;
}

.register-top {
  width: 100%;
  height: 40px;
  position: relative;
  padding: 10px 8px;
}

.register-central {
  width: 100%;
  height: calc(100% - 40px);
  position: relative;
}

.register-bottom {
  width: 100%;
  height: 0;
}

.register-content-top {
  width: 100%;
  height: 160px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.register-content-central {
  width: 100%;
  height: auto;
  padding-right: 30px;
  padding-left: 30px;
}

.register-content-bottom {
  width: 100%;
}

.register-media {
  width: 150px;
  height: 150px;
  background-image: url("../assets/img/logo.png");
  background-size: cover;
  background-position: center;
  position: relative;
  border-radius: 50%;
  overflow: hidden;
}

.register-content-con {
  /*border-bottom: 1px solid white;*/
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
  text-align: center;
  width: 100%;
  position: relative;
}

.register-content-con-label {
  width: 15%;
}

.register-content-con-input {
  width: 85%;
  font-size: 15px;
}

/*.register-content-bottom-button {*/
/*text-align: center;*/
/*width: 80%;*/
/*left: 10%;*/
/*}*/
.register-content-bottom-button {
  text-align: center;
  width: 100%;
  margin-top: 18px;
}

.register-content-bottom-button button {
  height: 42px;
  width: 80%;
  border-radius: 20px;
}

.register-content-file {
  font-size: 10px;
  width: 100%;
  height: 35px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.margin-top-10 {
  margin-top: 10px;
}

.mui-radio input[type='radio']:before, .mui-checkbox input[type='checkbox']:before {
  font-size: 20px;
}

.mui-radio input[type='radio'], .mui-checkbox input[type='checkbox'] {
  padding-top: 3px;
}

input[type='button'], input[type='submit'], input[type='reset'], button, .mui-btn {
  border: none;
}

input::-webkit-input-placeholder {
  /* WebKit browsers */
  color: #677387;
}

input:-moz-placeholder {
  /* Mozilla Firefox 4 to 18 */
  color: #677387;
}

input::-moz-placeholder {
  /* Mozilla Firefox 19+ */
  color: #677387;
}

input::-ms-input-placeholder {
  /* Internet Explorer 10+ */
  color: #677387;
}
</style>
