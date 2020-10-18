<template>
  <keep-alive>
    <!--首页，地图/气象 关注的船等-->
    <div style="width: 100%;height: 100%;position: relative">
      <!--上方船舶滑动条-->
      <vessel-slider :collects="collects"
                     @add="showSearchVesselPort" ref="vesselSlider"
                     @more="showVesselPortList"
                     style="position: relative;z-index: 2"
                     @changeCurrent="changeCurrentCollect"></vessel-slider>
      <!--地图-->
      <keep-alive>
        <home-map style="z-index: 1" @mapFinished="mapFinished"></home-map>
      </keep-alive>
      <canvas id="isolineText"></canvas>
      <div style="position: absolute;left: 12px;top: 158px;">
        <div class="main-icon-div" style="margin-bottom: 17px">
          <div @click="showFunc('mapSwitch')" style="text-align: center"
               :class="['bottom-button','home-map',func.actives.indexOf('mapSwitch') !== -1?'icon-checked':'icon-unchecked']"></div>
        </div>
        <div class="main-icon-div" style="margin-bottom: 16px">
          <div @click="showFunc('aisTrack')" style="text-align: center"
               :class="['bottom-button','icon-radar_SFontCN','whiconfont',func.actives.indexOf('aisTrack') !== -1?'icon-checked':'icon-unchecked']"></div>
        </div>

      </div>
      <!--上侧当前船舶气象数据-->
      <transition-group name="tran-top" tag="div">

      </transition-group>
      <transition name="weather">
        <div class="weather-pop " style="pointer-events: none" v-show="collects.length>0">
          <div style="width: 100%;height: 100%;display: flex;flex-direction: column">
            <div style="width: 80%;display: flex;flex-direction: row">
              <div style="height: 89px;padding-top: 17px;align-items: center" class="um-flex-column">
                <img :src="weatherImg" v-if="weatherImg"
                     style="height: 40px;width: 40px;margin-left: 14px;position: relative;bottom: 14px;">
                <div
                    style="position: relative; bottom: 14px;color: rgb(255, 255, 255);font-size: 14px;margin-left: 13px">
                                <span class="text-white"
                                      style="color: rgba(255,255,255,1);font-size:14px;margin-left: 5px">{{
                                    weather[0].value
                                  }}</span>

                </div>
              </div>
              <div>
                <div
                    style="width: calc(100%);flex-wrap: wrap;display: flex;margin-top: 17px;margin-left: 10px;width: 272px">
                  <div class="um-flex-row" v-for="item in weather" v-if="item.show"
                       style="height: 25px"
                       :style="{width:item.width?item.width:'90px'}">
                    <div :class="item.img" :style="{color:item.color}" class="whiconfont"></div>
                    <span class="text-white"
                          style="margin-left: 5px;color: white;font-size: 12px;margin-right: 10px;white-space: nowrap">{{
                        item.value
                      }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </transition>
      <!--左侧气象按钮-->
      <transition-group name="tran-left" tag="div" class="func-pop-parent" style="z-index:4;">

      </transition-group>


      <!--下方弹出框-->
      <transition-group name="popup-down" tag="div" class="func-pop-parent" style="bottom:0px;">
        <div key="mapTools" class="top-button-index">
          <div class="func-button-parent">
            <div class="main-icon-div whiconfont "
                 v-for="(item,index) in meteoTypes"
                 @click="meteoClick(index,item.meteoType,item.showType)"
            >
              <div :class="[
            item.icon,
            item.active?'icon-checked':'icon-unchecked','icon-font-size3']"></div>
            </div>
          </div>
        </div>
        <!--右下色卡-->
        <div key="colorLegend" style="margin-left: calc(100% - 175px);">
          <div
              style="overflow: hidden;"
              :class="{'animateColorLegendShow': showOrHideGradientColor,'animateColorLegendHide':!showOrHideGradientColor}"
          >
            <!--单位-->
            <div key="gradient-color-3" class="gradient-color"
                 style="width: 25px;z-index: 1;">
              <p class="gradient-color-font" style="top: calc(100% + 5px);">
                {{ showOrHideGradientColor ? gradientColor[currentGradientColorIndex].unit : '' }}</p>
            </div>
            <!--色卡颜色显示-->
            <div key="gradient-color-1" class="gradient-color"
                 @click="changeGradientColor()"
                 :style="{'background': showOrHideGradientColor?'linear-gradient(90deg'+gradientColor[currentGradientColorIndex].color+')':''}"
                 style="margin-left: 25px;">
            </div>
            <!--孙哥的色卡数值显示方式-->
            <div key="gradient-color-6" :style="{'width':gradientColorOptions.height+'px'}"
                 style="height: 25px;display: flex;margin-left: 25px;" class="gradient-color"
                 @click="changeGradientColor()">
              <div style="width: 21px;">
                <p class="gradient-color-font" style="top:0;">
                  {{ showOrHideGradientColor ? gradientColor[currentGradientColorIndex].foreColorValue : '' }}</p>
              </div>
              <div
                  :style="{'width':showOrHideGradientColor?(((gradientColorOptions.height-14*2-14*gradientColor[currentGradientColorIndex].colorValue.length)/(gradientColor[currentGradientColorIndex].colorValue.length+1)+14)+'px'):''}"
                  v-for="(item, index) in (showOrHideGradientColor?gradientColor[currentGradientColorIndex].colorValue:[])">
                <!--fixme:数值是反序的，即从上往下数值越来越小-->
                <p class="gradient-color-font" style="top:0;">{{ item }}</p>
              </div>
              <div
                  :style="{'width':showOrHideGradientColor?(((gradientColorOptions.height-14*2-14*gradientColor[currentGradientColorIndex].colorValue.length)/(gradientColor[currentGradientColorIndex].colorValue.length+1)+14)+'px'):''}">
                <p class="gradient-color-font" style="top:0;">
                  {{ showOrHideGradientColor ? gradientColor[currentGradientColorIndex].aftColorValue : '' }}</p>
              </div>
            </div>
          </div>
        </div>

        <div key="mapSwitch">
          <map-switch
              :frames="func"
              :map="map"
              class="func-pop border-bottom"></map-switch>
        </div>
        <!--船舶-港口-->
        <div key="vessel-port">
          <div style="display: flex;background: rgba(70, 70, 70, 0.34);width: 100%;"
               v-show="func.actives.indexOf('aisTrack') !== -1"
               :style="{'animation-play-state':func.keyframesAisTrack?'running':'paused','height':pauseHeight+'px'}"
               :class="{'animateVesselPortShow': func.keyframesAisTrack&&func.actives.indexOf('aisTrack') !== -1,'animateVesselPortHide':func.keyframesAisTrack&&!(func.actives.indexOf('aisTrack') !== -1) }"
          >
            <ais-card v-show="currentCollect&&currentCollect.type==='10'"
                      :frames="func"
                      ref="aisCard"
                      class="func-pop"
                      @changeVoyageType="changeVoyageType"
                      @routerToVesselOrPortDetail="routerToVesselOrPortDetail"
            ></ais-card>
            <map-port-card v-show="currentCollect&&currentCollect.type==='20'"
                           @routerToVesselOrPortDetail="routerToVesselOrPortDetail"
                           ref="mapPortCard"
                           class="func-pop"></map-port-card>
          </div>
        </div>

        <!--气象播放组件-->
        <div key="meteoSlider">
          <meteo-slider ref="meteoSlider"
                        :frames="func"
                        :initSlideTo="'now'"
                        :style="{'margin-bottom':$store.state.um.showBottomMenu?'63px':''}"
                        @meteoShow="meteoShow"
                        @meteoHide="meteoHide"
                        @meteoPeriod="meteoPeriod"
                        @dateChange="meteoTimeChange"></meteo-slider>
        </div>
      </transition-group>

      <!--查询添加港口船舶-->
      <transition name="search">
        <search-port-vessel
            v-if="searchPortVesselShow"
            :showCollectIcon="true"
            :collects="collects"
            @collectChange="searchCollect"
            @chooseCollect="chooseCollect"
            @close="closeSearch"></search-port-vessel>
      </transition>

      <!--港口船舶服务列表及详情-->
      <keep-alive>
        <router-view class="cover-router-view"/>
      </keep-alive>
    </div>
  </keep-alive>
</template>

<script lang="ts">
import Vue from "vue"
import HomeMap from "../../components/map/index.vue"
import MapSwitch from "./home-components/map-switch.vue"
import ColorLegend from "./home-components/color-legend.vue"

import service from "@/service"
import dolphin from "@/components/dolphin";

import mutationType from "@/store/mutationType";

const aisTrackKey = "aisTrackKey";

export default Vue.extend({
  name: "",
  components: {
    HomeMap,
    MapSwitch,
    ColorLegend,
  },
  data() {
    return {

      // region fixme:下方菜单栏各部分高度
      menuHeight: {
        colorLegend: 35,     // 色卡
        three: 40,
        two: 170,
        one: 30,
        bottom: 63,          // 底部菜单栏
      },

      // endregion
      //显示船舶相关
      collects: [],
      currentCollect: null,
      // 功能按钮及弹出框
      func: {
        buttons: [
          {transitionNum: "three", type: "mapSwitch", iconClass: "home-map"},
          {transitionNum: "two", type: "aisTrack", iconClass: "home-vessel"},
          {transitionNum: "one", type: "meteoSwitch", iconClass: "home-meteo-typhoon"},
        ],
        actives: [],
        transitionNums: [],
        keyframesMap: false,
        keyframesAisTrack: false,
        keyframesMeteo: false,
      },
      // 地图
      map: null,
      weatherImg: null,
      weather: [
        {img: "icon-tmp", value: "24℃", color: "#ffff00", show: false},
        {img: "icon-qiya", value: "1020hpa", color: "rgb(252, 112, 20)", meteoType: "At0", show: true},
        {img: "icon-nengjiandu1", value: "24km", color: "rgb(0, 176, 240)", show: true, meteoType: "Vis"},
        {img: "", value: "", color: "#00b0f0", show: true},//占位
        {img: "icon-fengxiang", value: "NNE bf 6", color: "rgb(0, 176, 240)", show: true, meteoType: "W",},
        {
          img: "home-weather-shade-sw1",
          value: "3.5m dl4",
          color: "rgb(251, 178, 16)",
          show: true,
          meteoType: "Cwh"
        },
        {
          img: "home-weather-shade-cwh",
          value: "SE 0.2kn",
          color: "rgb(146, 208, 80)",
          show: true,
          meteoType: "Ss",
        },
        // {img: "icon-feng", value: "", color: "dodgerblue", show: true, meteoType: "WBar"},

      ],
      // ais 轨迹
      // 历史挂靠港口即时间
      berthPorts: [
        {name: "AMSTERDAM", time: new Date()},
        {name: "KALBA", time: new Date()},
        {name: "AZOV", time: new Date()},
        {name: "DUBAI", time: new Date()},
        {name: "AIRLIE", time: new Date()},
        {name: "ZIRKU", time: new Date()},
        {name: "SUEZ", time: new Date()},
      ],
      // 延迟事件
      maptoggleMenu: null,
      // 是否显示搜索框
      searchPortVesselShow: false,
      methodsNeedMap: [],
      debounceLoadVesselOrPort: null,
      debounceIsLogin: null,
      showPresentOrLast: "Last",
      history_before: 90,
      aisPresent: {
        startTime: null,
        endTime: null,
      },
      aisLast: {
        startTime: null,
        endTime: null,
      },
    }
  },
  beforeRouteEnter(to, from, next) {
    next((vm: any) => {
      if (vm.$store.state.um.user) {

      } else {
        vm.initAllButton();
      }
    })
  },
  beforeRouteLeave(to, from, next) {
    this.$refs["meteoSlider"].meteoSwiper.autoplay.stop();
    this.$refs["meteoSlider"].meteoSwiperPlay = false;
    this.func.keyframesMap = false;
    this.func.keyframesAisTrack = false;
    this.func.keyframesMeteo = false;
    /*if (to.path == "/login") {
        this.meteo.removeContext();
        this.map.remove();
    }*/
    /*let index = this.func.actives.indexOf("aisTrack");
    if (index != -1) {
        this.func.actives.splice(index, 1);
        this.func.transitionNums.splice(index, 1);
    }
    // this.getPresentOrLastAisRoute();
    this.getAisRoute();*/
    next();
  },
  mounted() {
    this.initUser();
    this.initDebounceEvents();
    SQLlite.initSqlite().then(() => {
      this.searchCollect()

    })


    this.$nextTick(() => {
      // console.log("mounted")
      // this.debounceIsLogin();
    });

  },
  activated() {
    if (this.map)
      this.map.resize();
    this.$nextTick(() => {
      // console.log("activated");
      // this.debounceIsLogin();
    });
  },
  methods: {
    initUser() {
      sqliteUtil.select(SQLlite.DB_OBJ, SQLlite.LOCAL_USER, {}).then(data => {
        if (!data || data.rows.length == 0) {
          let user = {
            key: "mobile" + utilDolphin.guid8(),
            createTime: new Date().getTime()
          };
          sqliteUtil.insert(SQLlite.DB_OBJ, SQLlite.LOCAL_USER, user).then(data => {
            this.$store.state.um.user = user;
          })
        } else {
          this.$store.state.um.user = data.rows.item(0)
        }

      })

    },
    weatherPopDataShow(weatherData) {
      this.transWeatherToImg(this.meteoForecast(weatherData.weathers[6].data[0], weatherData.weathers[7].data[0]));
      this.weather[0].value = (weatherData.weathers[3].data[0]) ? (Math.round(dolphin.tmpToC(weatherData.weathers[3].data[0])) + " ℃") : "--";
      this.weather[1].value = (weatherData.weathers[0].data[0]) ? (Math.round(dolphin.meteoAt0(weatherData.weathers[0].data[0])) + " hpa") : "--";
      this.weather[4].value = (weatherData.weathers[1].data[0][0]) ? (dolphin.meteodegree(dolphin.meteoWindDir(weatherData.weathers[1].data[0][0], weatherData.weathers[1].data[0][1])) + " bf " + dolphin.meteoWindBf(weatherData.weathers[1].data[0][0], weatherData.weathers[1].data[0][1])) : "--";
      this.weather[5].value = (weatherData.weathers[10].data[0][0]) ? (weatherData.weathers[10].data[0][0].toFixed(1) + "m dl " + dolphin.meteoWaveDL(weatherData.weathers[10].data[0][0])) : "--";
      this.weather[6].value = (weatherData.weathers[13].data[0][0]) ? (dolphin.meteodegree(dolphin.meteoSsDir(weatherData.weathers[13].data[0][0], weatherData.weathers[13].data[0][1])) + " " + dolphin.meteoSsSpeed2(weatherData.weathers[13].data[0][0], weatherData.weathers[13].data[0][1]).toFixed(1) + " kn") : "--";
      this.weather[2].value = (weatherData.weathers[4].data[0]) ? (Math.round(weatherData.weathers[4].data[0] / 1000) + " km") : "--";


    },
    meteoForecast(apcp, cloud) {
      if (apcp > 0 && apcp) {
        return "rain"
      } else {
        if ((cloud / 100 < 0.3) || !cloud) {
          return "sunny"
        } else if (cloud / 100 > 0.9) {
          return "overcast"
        } else {
          return "cloudy"
        }
      }
    },
    transWeatherToImg(weather) {
      let urlHead = "./img/portWeather/";
      let suffix;
      switch (weather) {
        case"rain":
          suffix = "rainy.png";
          break
        case "sunny":
          suffix = "sunny.png"
          break;
        case "overcast":
          suffix = "yintian.png";
          break;
        case "cloudy":
          suffix = "cloudy.png"

      }
      this.weatherImg = urlHead + suffix;


    },
    // 注销后，再登录时应把所有跟个人信息挂钩的状态清空
    initAllButton() {
      // (1)右侧按钮「船舶-港口」关闭
      let index = this.func.actives.indexOf("aisTrack");
      if (index != -1) {
        this.func.actives.splice(index, 1);
        this.func.transitionNums.splice(index, 1);
      }
      if (this.map) { // 地图存在的话
        // (1)「船舶-港口」详情的地图相关信息
        this.getAisRoute();     // 隐藏ais轨迹
        // (2)船点、船框点数据都清空
        let emptyGeojson: any = {
          "type": "FeatureCollection",
          "features": []
        };
        if (this.map.getSource("aisShip")) {
          this.map.getSource("aisShip").setData(emptyGeojson);
        }
        if (this.map.getSource("port")) {
          this.map.getSource("port").setData(emptyGeojson);
        }
        if (this.map.getSource("singleAisShipBorder")) {
          this.map.getSource("singleAisShipBorder").setData(emptyGeojson);
        }
      }
    },
    initDebounceEvents() {
      // 点击地图弹出隐藏菜单栏
      this.maptoggleMenu = (lodash as any).debounce(() => {
        // if (!(this.$route.query && this.$route.query.toggle === false)) {
        //     this.$store.commit(mutationType.showBottomMenu, null);
        // }
      }, 0);
      this.debounceLoadVesselOrPort = (lodash as any).debounce(() => {

        this.searchVesselOrPort();
      }, 1000);
      this.debounceIsLogin = (lodash as any).debounce(() => {
        Security.auth("").then((isAuth) => {
          console.log("debounceIsLogin" + isAuth)
          this.isLogin = isAuth;
          if (this.isLogin) {
            this.searchCollect();
          }
        });
      }, 300);
    },
    // 右上角按钮，点击显示功能
    showFunc(item) {

      item = {type: item};
      if (item.type === "aisTrack" && !this.isLogin) {
        // this.$router.push({path: "/login"});
        this.$store.commit(mutationType.showOrHideLogin, {showOrHideLogin: true});
        return;
      }
      if (item.type === "aisTrack" && this.collects.length == 0) {
        this.$mui.toast("请关注船舶、港口");
        return
      }

      if (item.type === "mapSwitch") {

        this.func.keyframesMap = true;
      } else if (item.type === "aisTrack") {
        this.func.keyframesAisTrack = true;
      } else if (item.type === "meteoSwitch") {
        this.func.keyframesMeteo = true;
      }
      let index = this.func.actives.indexOf(item.type);
      if (index != -1) {
        if (item.type === "aisTrack") {
          (this.$refs.aisCard as any).initVoyageType();   // 传递数据到子组件来渲染
        }
        this.func.actives.splice(index, 1);
        this.func.transitionNums.splice(index, 1);
      } else {
        // 显示
        this.func.actives.push(item.type);
        this.func.transitionNums.push(item.transitionNum);
        this.$nextTick(() => {
          // if (item.type === "aisTrack") {
          //     (this.$refs.aisCard as any).initVoyageType();   // 传递数据到子组件来渲染
          //     this.searchVesselOrPort();
          // }
        })
      }
      /*if (item.type === "aisTrack") {
          (this.$refs.aisCard as any).initVoyageType();   // 传递数据到子组件来渲染
          // this.getPresentOrLastAisRoute();
          // this.getAisRoute();  // 关闭按钮时隐藏航迹
          if (this.func.actives.indexOf('aisTrack') !== -1) { // 切换船时才加载船具体信息，上来先不加载具体信息；但第一条船还是要加载的，否则一开始点按钮会是空的信息
              this.searchVesselOrPort();
          }
      }*/
      // if (item.type === "aisTrack") { // 移入上面 else 中
      //     // this.getPresentOrLastAisRoute();
      //     // this.getAisRoute();
      //     this.searchVesselOrPort();
      // }
    },
    // 地图创建完成
    mapFinished(map) {
      console.log("mapFinished")
      this.map = map;
      // 初始化气象meteo.class
      this.meteo = new Meteo(this.map);
      this.map.on("click", this.maptoggleMenu);
      if (this.collects.length > 0) {
        this.initMapEvent();
      }
    },
    initMapEvent() {

      this.initMapAis(this.collects.filter((item: any) => item.type == 10));
      this.initMapPort(this.collects.filter((item: any) => item.type == 20));
      this.flyTo(this.collects[0].lon, this.collects[0].lat);
      this.showShipOrPortBorder(this.currentCollect.lon, this.currentCollect.lat);
    },
    // 地图事件
    zoomZero() {
      this.map.flyTo({bearing: 0, pitch: 0, speed: 0.2});
    },
    zoomIn() {
      this.map.setZoom(this.map.getZoom() + 1);
      /*// 创建本地消息测试
       let str = "欢迎使用中气导APP！";
       let payload: any = {
           type: "localMessage",
           route: "/home",
           title: "欢迎",
           content: str,
       };
       let options = {cover: false};
       plus.push.createMessage(str, JSON.stringify(payload), options);*/
    },
    zoomOut() {
      this.map.setZoom(this.map.getZoom() - 1);
    },
  },
  computed: {
    isLogin() {
      // console.log("计算isLogin")
      if (this.$store.state.um.user != null) {
        // this.searchCollect();
        // console.log("计算isLogin：true" )
        return true;
      } else {
        // console.log("计算isLogin：false" )
        return false;
      }
    },
    leftHeight() {
      let bottom = 82;
      if (this.func.transitionNums.indexOf('three') !== -1) {
        bottom += this.menuHeight.three;
      }
      if (this.func.transitionNums.indexOf('two') !== -1) {
        bottom += this.menuHeight.two;
      }
      if (this.func.transitionNums.indexOf('one') !== -1) {
        bottom += this.menuHeight.one;
      }
      if (!this.$store.state.um.showBottomMenu) {
        bottom -= this.menuHeight.bottom;
      }
      return bottom;
    },
    showBottomMenu() {
      return this.$store.state.um.showBottomMenu
    },
    // region 原始版下拉动画
    /* menuHeight: {
            colorLegend: 35,     // 色卡
            aisTrack: 170,       // 船信息
            meteo: 30,           // 气象
            map: 40,             // 地图
            bottom: 63,          // 底部菜单栏
        },*/
    /*mapMenuMarginBottom() {
        let height: any = 0;
        if (this.$store.state.um.showBottomMenu) {    // 如果下方菜单栏存在的话
            if (this.func.actives.indexOf('mapSwitch') !== -1) {   // 打开1
                height = 303;
                if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开2
                    height = 303;
                } else if (this.func.actives.indexOf('meteoSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 303;
                } else {  // 关闭2,3
                    height = 303;
                }
            } else {  // 关闭1
                height = 0;
                if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开2
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 0;
                } else {  // 关闭2,3
                    height = 0;
                }
            }
        } else {      // 如果下方菜单栏不存在的话
            if (this.func.actives.indexOf('mapSwitch') !== -1) {   // 打开1
                height = 240;
                if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开2
                    height = 240;
                } else if (this.func.actives.indexOf('meteoSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 240;
                } else {  // 关闭2,3
                    height = 240;
                }
            } else {  // 关闭1
                height = 0;
                if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开2
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 0;
                } else {  // 关闭2,3
                    height = 0;
                }
            }
        }
        return height;
    },
    mapMenuMarginTop() {
        let height: any = 0;
        if (this.$store.state.um.showBottomMenu) {    // 如果下方菜单栏存在的话
            if (this.func.actives.indexOf('mapSwitch') !== -1) {   // 打开1
                height = 0;
                if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开2
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 0;
                } else {  // 关闭2,3
                    height = 0;
                }
            } else {  // 关闭1
                height = 0;
                if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开2
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 0;
                } else {  // 关闭2,3
                    height = 0;
                }
            }
        } else {      // 如果下方菜单栏不存在的话
            if (this.func.actives.indexOf('mapSwitch') !== -1) {   // 打开1
                height = 0;
                if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开2
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 0;
                } else {  // 关闭2,3
                    height = 0;
                }
            } else {  // 关闭1
                height = 0;
                if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开2
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 0;
                } else {  // 关闭2,3
                    height = 0;
                }
            }
        }
        return height;
    },
    meteoSliderMenuMarginBottom() {
        let height: any = 0;
        if (this.$store.state.um.showBottomMenu) {    // 如果下方菜单栏存在的话
            if (this.func.actives.indexOf('meteoSwitch') !== -1) {   // 打开2
                height = 263;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开1
                    height = 0;
                } else if (this.func.actives.indexOf('mapSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 263;
                } else if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开1,3
                    height = 0;
                } else {  // 关闭1,3
                    height = 263;
                }
            } else {  // 关闭2
                height = 0;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开1
                    height = -303;
                } else if (this.func.actives.indexOf('mapSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 0;
                } else if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开1,3
                    height = -133;
                } else {  // 关闭1,3
                    height = 0;
                }
            }
        } else {      // 如果下方菜单栏不存在的话
            if (this.func.actives.indexOf('meteoSwitch') !== -1) {   // 打开2
                height = 200;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开1
                    height = 0;
                } else if (this.func.actives.indexOf('mapSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 200;
                } else if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开1,3
                    height = 0;
                } else {  // 关闭1,3
                    height = 200;
                }
            } else {  // 关闭2
                height = 0;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开1
                    height = -240;
                } else if (this.func.actives.indexOf('mapSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 0;
                } else if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开1,3
                    height = -133;
                } else {  // 关闭1,3
                    height = 0;
                }
            }
        }
        return height;
    },
    meteoSliderMenuMarginTop() {
        let height: any = 0;
        if (this.$store.state.um.showBottomMenu) {    // 如果下方菜单栏存在的话
            if (this.func.actives.indexOf('meteoSwitch') !== -1) {   // 打开2
                height = 0;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开1
                    height = 0;
                } else if (this.func.actives.indexOf('mapSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 0;
                } else if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开1,3
                    height = 0;
                } else {  // 关闭1,3
                    height = 0;
                }
            } else {  // 关闭2
                height = 0;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开1
                    height = 0;
                } else if (this.func.actives.indexOf('mapSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 0;
                } else if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开1,3
                    height = 133;
                } else {  // 关闭1,3
                    height = 0;
                }
            }
        } else {      // 如果下方菜单栏不存在的话
            if (this.func.actives.indexOf('meteoSwitch') !== -1) {   // 打开2
                height = 0;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开1
                    height = 0;
                } else if (this.func.actives.indexOf('mapSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 0;
                } else if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开1,3
                    height = 0;
                } else {  // 关闭1,3
                    height = 0;
                }
            } else {  // 关闭2
                height = 0;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') === -1) {   // 打开1
                    height = 0;
                } else if (this.func.actives.indexOf('mapSwitch') === -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                    height = 0;
                } else if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('aisTrack') !== -1) {   // 打开1,3
                    height = 133;
                } else {  // 关闭1,3
                    height = 0;
                }
            }
        }
        return height;
    },
    vesselPortMenuMarginBottom() {
        let height: any = 0;
        if (this.$store.state.um.showBottomMenu) {    // 如果下方菜单栏存在的话
            if (this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                height = 233;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('meteoSwitch') === -1) {   // 打开1
                    height = -30;
                } else if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('mapSwitch') === -1) {   // 打开2
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('mapSwitch') !== -1) {   // 打开1,2
                    height = 0;
                } else {  // 关闭1,2
                    height = 233;
                }
            } else {  // 关闭3
                height = 0;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('meteoSwitch') === -1) {   // 打开1
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('mapSwitch') === -1) {   // 打开2
                    height = -263;
                } else if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('mapSwitch') !== -1) {   // 打开1,2
                    height = -303;
                } else {  // 关闭1,2
                    height = 0;
                }
            }
        } else {      // 如果下方菜单栏不存在的话
            if (this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                height = 170;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('meteoSwitch') === -1) {   // 打开1
                    height = -30;
                } else if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('mapSwitch') === -1) {   // 打开2
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('mapSwitch') !== -1) {   // 打开1,2
                    height = 0;
                } else {  // 关闭1,2
                    height = 170;
                }
            } else {  // 关闭3
                height = 0;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('meteoSwitch') === -1) {   // 打开1
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('mapSwitch') === -1) {   // 打开2
                    height = -200;
                } else if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('mapSwitch') !== -1) {   // 打开1,2
                    height = -240;
                } else {  // 关闭1,2
                    height = 0;
                }
            }
        }
        return height;
    },
    vesselPortMenuMarginTop() {
        let height: any = 0;
        if (this.$store.state.um.showBottomMenu) {    // 如果下方菜单栏存在的话
            if (this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                height = 0;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('meteoSwitch') === -1) {   // 打开1
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('mapSwitch') === -1) {   // 打开2
                    height = 0;
                } else {  // 关闭1,2
                    height = 0;
                }
            } else {  // 关闭3
                height = 0;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('meteoSwitch') === -1) {   // 打开1
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('mapSwitch') === -1) {   // 打开2
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('mapSwitch') !== -1) {   // 打开1,2
                    height = 0;
                } else {  // 关闭1,2
                    height = 0;
                }
            }
        } else {      // 如果下方菜单栏不存在的话
            if (this.func.actives.indexOf('aisTrack') !== -1) {   // 打开3
                height = 0;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('meteoSwitch') === -1) {   // 打开1
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('mapSwitch') === -1) {   // 打开2
                    height = 0;
                } else {  // 关闭1,2
                    height = 0;
                }
            } else {  // 关闭3
                height = 0;
                if (this.func.actives.indexOf('mapSwitch') !== -1 && this.func.actives.indexOf('meteoSwitch') === -1) {   // 打开1
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('mapSwitch') === -1) {   // 打开2
                    height = 0;
                } else if (this.func.actives.indexOf('meteoSwitch') !== -1 && this.func.actives.indexOf('mapSwitch') !== -1) {   // 打开1,2
                    height = 0;
                } else {  // 关闭1,2
                    height = 0;
                }
            }
        }
        return height;
    },
    colorLegendMenuMarginBottom() {
        let bottom = 0;
        if (this.showOrHideGradientColor) {
            if (this.func.actives.indexOf('aisTrack') !== -1) {
                bottom = 0;
            } else {
                if (this.func.actives.indexOf('meteoSwitch') !== -1) {
                    bottom += 30;
                }
                if (this.func.actives.indexOf('mapSwitch') !== -1) {
                    bottom += 40;
                }
                if (this.$store.state.um.showBottomMenu) {
                    bottom += 63;
                }
            }
        } else {
            if (this.func.actives.indexOf('aisTrack') !== -1) {
                bottom = -170;
                if (this.func.actives.indexOf('meteoSwitch') !== -1) {
                    bottom -= 30;
                }
                if (this.func.actives.indexOf('mapSwitch') !== -1) {
                    bottom -= 40;
                }
                if (this.$store.state.um.showBottomMenu) {
                    bottom -= 63;
                }
            } else {
                bottom = -35;
            }
        }
        return bottom;
    },*/
    // endregion
    // region 整合版下拉动画
    /*mapMenuMarginBottom() {
        let height: any = 0;
        if (this.$store.state.um.showBottomMenu) {    // 如果下方菜单栏存在的话
            if (this.func.transitionNums.indexOf('one') !== -1) {   // 打开1
                height = this.menuHeight.one + this.menuHeight.two + this.menuHeight.three + this.menuHeight.bottom;
            } else {  // 关闭1
                height = 0;
            }
        } else {      // 如果下方菜单栏不存在的话
            if (this.func.transitionNums.indexOf('one') !== -1) {   // 打开1
                height = this.menuHeight.one + this.menuHeight.two + this.menuHeight.three;
            } else {  // 关闭1
                height = 0;
            }
        }
        return height;
    },
    meteoSliderMenuMarginBottom() {
        let height: any = 0;
        if (this.$store.state.um.showBottomMenu) {    // 如果下方菜单栏存在的话
            if (this.func.transitionNums.indexOf('two') !== -1) {   // 打开2
                if (this.func.transitionNums.indexOf('one') !== -1) {
                    height = 0;
                } else {
                    height = this.menuHeight.two + this.menuHeight.three + this.menuHeight.bottom;
                }
            } else {  // 关闭2
                if (this.func.transitionNums.indexOf('one') !== -1 && this.func.transitionNums.indexOf('three') === -1) {   // 打开1
                    height = -(this.menuHeight.one + this.menuHeight.two + this.menuHeight.three + this.menuHeight.bottom);
                } else if (this.func.transitionNums.indexOf('one') !== -1 && this.func.transitionNums.indexOf('three') !== -1) {   // 打开1,3
                    height = -(this.menuHeight.one + this.menuHeight.two + this.menuHeight.bottom);
                } else {  // 关闭1,3
                    height = 0;
                }
            }
        } else {      // 如果下方菜单栏不存在的话
            if (this.func.transitionNums.indexOf('two') !== -1) {   // 打开2
                if (this.func.transitionNums.indexOf('one') !== -1) {
                    height = 0;
                } else {
                    height = this.menuHeight.two + this.menuHeight.three;
                }
            } else {  // 关闭2
                if (this.func.transitionNums.indexOf('one') !== -1 && this.func.transitionNums.indexOf('three') === -1) {   // 打开1
                    height = -(this.menuHeight.one + this.menuHeight.two + this.menuHeight.three);
                } else if (this.func.transitionNums.indexOf('one') !== -1 && this.func.transitionNums.indexOf('three') !== -1) {   // 打开1,3
                    height = -(this.menuHeight.one + this.menuHeight.two + this.menuHeight.bottom);
                } else {  // 关闭1,3
                    height = 0;
                }
            }
        }
        return height;
    },
    meteoSliderMenuMarginTop() {
        let height: any = 0;
        if (this.$store.state.um.showBottomMenu) {    // 如果下方菜单栏存在的话
            if (this.func.transitionNums.indexOf('two') !== -1) {   // 打开2
                height = 0;
            } else {  // 关闭2
                if (this.func.transitionNums.indexOf('one') !== -1 && this.func.transitionNums.indexOf('three') !== -1) {   // 打开1,3
                    height = this.menuHeight.one + this.menuHeight.two + this.menuHeight.bottom;
                } else {  // 关闭1,3
                    height = 0;
                }
            }
        } else {      // 如果下方菜单栏不存在的话
            if (this.func.transitionNums.indexOf('two') !== -1) {   // 打开2
                height = 0;
            } else {  // 关闭2
                if (this.func.transitionNums.indexOf('one') !== -1 && this.func.transitionNums.indexOf('three') !== -1) {   // 打开1,3
                    height = this.menuHeight.one + this.menuHeight.two + this.menuHeight.bottom;
                } else {  // 关闭1,3
                    height = 0;
                }
            }
        }
        return height;
    },
    vesselPortMenuMarginBottom() {
        let height: any = 0;
        if (this.$store.state.um.showBottomMenu) {    // 如果下方菜单栏存在的话
            if (this.func.transitionNums.indexOf('three') !== -1) {   // 打开3
                if (this.func.transitionNums.indexOf('one') !== -1 && this.func.transitionNums.indexOf('two') === -1) {   // 打开1
                    height = -this.menuHeight.two;
                } else if (this.func.transitionNums.indexOf('two') !== -1 && this.func.transitionNums.indexOf('one') === -1) {   // 打开2
                    height = 0;
                } else if (this.func.transitionNums.indexOf('two') !== -1 && this.func.transitionNums.indexOf('one') !== -1) {   // 打开1,2
                    height = 0;
                } else {  // 关闭1,2
                    height = this.menuHeight.three + this.menuHeight.bottom;
                }
            } else {  // 关闭3
                if (this.func.transitionNums.indexOf('two') !== -1 && this.func.transitionNums.indexOf('one') === -1) {   // 打开2
                    height = -(this.menuHeight.two + this.menuHeight.three + this.menuHeight.bottom);
                } else if (this.func.transitionNums.indexOf('two') !== -1 && this.func.transitionNums.indexOf('one') !== -1) {   // 打开1,2
                    height = -(this.menuHeight.one + this.menuHeight.two + this.menuHeight.three + this.menuHeight.bottom);
                } else {  // 关闭1,2
                    height = 0;
                }
            }
        } else {      // 如果下方菜单栏不存在的话
            if (this.func.transitionNums.indexOf('three') !== -1) {   // 打开3
                if (this.func.transitionNums.indexOf('one') !== -1 && this.func.transitionNums.indexOf('two') === -1) {   // 打开1
                    height = -this.menuHeight.two;
                } else if (this.func.transitionNums.indexOf('two') !== -1) {   // 打开2
                    height = 0;
                } else {  // 关闭1,2
                    height = this.menuHeight.three;
                }
            } else {  // 关闭3
                if (this.func.transitionNums.indexOf('two') !== -1 && this.func.transitionNums.indexOf('one') === -1) {   // 打开2
                    height = -(this.menuHeight.two + this.menuHeight.three);
                } else if (this.func.transitionNums.indexOf('two') !== -1 && this.func.transitionNums.indexOf('one') !== -1) {   // 打开1,2
                    height = -(this.menuHeight.one + this.menuHeight.two + this.menuHeight.three);
                } else {  // 关闭1,2
                    height = 0;
                }
            }
        }
        return height;
    },
    colorLegendMenuMarginBottom() {
        let bottom = 0;
        if (this.showOrHideGradientColor) {
            if (this.func.transitionNums.indexOf('three') !== -1) {
                bottom = 0;
            } else {
                if (this.func.transitionNums.indexOf('two') !== -1) {
                    bottom += this.menuHeight.two;
                }
                if (this.func.transitionNums.indexOf('one') !== -1) {
                    bottom += this.menuHeight.one;
                }
                if (this.$store.state.um.showBottomMenu) {
                    bottom += this.menuHeight.bottom;
                }
            }
        } else {
            if (this.func.transitionNums.indexOf('three') !== -1) {
                bottom = -this.menuHeight.three;
                if (this.func.transitionNums.indexOf('two') !== -1) {
                    bottom -= this.menuHeight.two;
                }
                if (this.func.transitionNums.indexOf('one') !== -1) {
                    bottom -= this.menuHeight.one;
                }
                if (this.$store.state.um.showBottomMenu) {
                    bottom -= this.menuHeight.bottom;
                }
            } else {
                bottom = -this.menuHeight.colorLegend;
            }
        }
        return bottom;
    },*/
    // endregion
    // region 整合版高度减小下拉动画
    pauseHeight() {
      if (this.func.keyframesAisTrack === false) {
        if (this.func.actives.indexOf('aisTrack') !== -1) {
          return 180;
        } else {
          return 0;
        }
      } else {
        return null;
      }
    },
    // endregion
    // region
    /*popDownBottomMapSwitch() {
        let bottom = 0;
        for (let i = 0; i < this.func.actives.length; i++) {
            if (this.func.actives[i] == "aisTrack") {
                bottom += 170;
            } else if (this.func.actives[i] == "meteoSwitch") {
                bottom += 30;
            }
        }
        return bottom + "px";
    },
    popDownBottomAisTrack() {
        let bottom = 0;
        if (this.func.actives.indexOf("meteoSwitch") != -1) {
            bottom += 30;
        }
        return bottom + "px";
    },*/
    // endregion

  },
  watch: {
    "$store.state.um.user"(val) {
      if (!val) {
        this.collects = [];
      }
    },
    meteoTypes: {
      deep: true,
      handler: function (val) {

      }
    },
  }

})
</script>

<style scoped lang="less">
@fontSize: 12px;
@bottom-height: 63px;
.gradient-color {
  width: 150px;
  /*position: absolute;*/
  /*z-index: 2;*/
  /*top: 60px;*/
  /*left: 5px;*/
  height: 5px;
}

.gradient-color-enter-active, .gradient-color-leave-active {
  transition: all 0.5s;
  opacity: 1;
}

.gradient-color-enter, .gradient-color-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

.gradient-color-font {
  text-align: center;
  top: calc(100% - @fontSize / 2); /*todo:这个不对，不应该是通过字体大小来判断，而应该是显示高度，还没想好怎么把位置固定到正好中间，虽然现在看不出来，很接近中间*/
  color: white;
  position: relative;
}

.tran-top-enter-active, .tran-top-leave-active {
  transition: all 0.5s;
  opacity: 1;
}

.tran-top-enter, .tran-top-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

.tran-left-enter-active, .tran-left-leave-active {
  transition: all 0.5s;
  opacity: 1;
}

.tran-left-enter {
  opacity: 0;
  transform: translateX(100%);
}

.tran-left-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

.tran-left-move {
  transition: all 0.5s;
}

.meteo-button-active {
  color: #fc7014 !important;
}

#isolineText {
  position: absolute;
  left: 0px;
  top: 0px;
  z-index: 0 !important;
}

.func-button-parent {
  position: absolute;
  right: 12px;
  top: 70px;
  height: 0;

  .func-button {
    margin-top: 15px;
    text-align: center;
    width: 28px;
    height: 28px;
    line-height: 28px;
    /*background: rgba(70,70,70,0.3);*/
    /*background: white;*/
    border-radius: 2px;
  }
}

.pop-up-enter-active, .pop-up-leave-active {
  transition: all 0.5s;
}

.pop-up-enter, .pop-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/*.pop-up-item{*/
/*transition: all 1s;*/
/*}*/
.pop-up-move {
  transition: all 0.5s;
}

.pop-up-leave-active {
  position: absolute;
  width: 100%;
}

/*功能弹出框动画*/
.popup-down-move {
  transition: transform 0.5s;
}

/*.popup-down-enter, .popup-down-leave-to {
    opacity: 0;
}*/

/*.popup-down-active, .popup-down-leave-active {
    transition: all 0.6s;
}

.popup-down-enter, .popup-down-leave-to
    !* .list-leave-active for below version 2.1.8 *! {
    opacity: 0;
    transform: translateY(100%);
}

.popup-down-child-active, .popup-down-child-leave-active {
    transition: all 0.6s;
}

.popup-down-child-enter, .popup-down-child-leave-to
    !* .list-leave-active for below version 2.1.8 *! {
    opacity: 0;
    transform: translateY(100%);
}*/

.animateVesselPortShow {
  animation: keyframesVesselPortShow 0.5s;
  animation-fill-mode: both;
  /*animation-timing-function: linear;*/
}

@keyframes keyframesVesselPortShow {
  0% {
    height: 0px;
  }
  100% {
    height: 180px;
  }
}

.animateVesselPortHide {
  animation: keyframesVesselPortHide 0.5s;
  animation-fill-mode: both;
  /*animation-timing-function: linear;*/
}

@keyframes keyframesVesselPortHide {
  0% {
    height: 180px;
  }
  100% {
    height: 0px;
  }
}

.animateColorLegendShow {
  animation: keyframesColorLegendShow 0.5s;
  animation-fill-mode: both;
  /*animation-timing-function: linear;*/
}

@keyframes keyframesColorLegendShow {
  0% {
    height: 0px;
  }
  100% {
    height: 30px;
  }
}

.animateColorLegendHide {
  animation: keyframesColorLegendHide 0.5s;
  animation-fill-mode: both;
  /*animation-timing-function: linear;*/
}

@keyframes keyframesColorLegendHide {
  0% {
    height: 30px;
  }
  100% {
    height: 0px;
  }
}

.func-pop-parent {
  z-index: 3;
  position: absolute;
  bottom: @bottom-height;
  width: 100%;
  /*height: auto;*/
  /*height: calc(100% - 210px);*/
  /*max-height: calc(100% - 210px);*/
  /*overflow-y: scroll;*/
  /*overflow: hidden;*/

  .func-pop {
    background-color: var(--back-color);
  }
}

.top-button-index {
  position: absolute;
  /*top: -165px;*/
  /*top: -180px;*/
  /*top: -140px;*/
  top: -386px;
  /*left: 16px;*/
  right: 0px;
}

.main-icon-div {
  /*background: white;*/
  width: 28px;
  height: 28px;
  line-height: 28px;
  border-radius: 2px;
  padding-left: 12px;
}

.bottom-button {
  color: #1e90ff;
}

/*搜索弹出动画*/

.search-enter-active, .search-leave-active {
  transition: all 0.3s;
}

.search-enter, .search-leave-to {
  transform: translateX(-100%);
}

.cover-router-view {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 20;
}

.icon-tmp:before {
  font-size: 28px;
}

.icon-feng:before {
  font-size: 13px;
  font-weight: 900;
  margin-left: -1px;
}

.weather-pop .icon-bolangnengguancedian:before {
  font-size: 14px;

}

.weather-pop .icon-fengxiang:before {
  margin-right: -1px;

}
</style>
