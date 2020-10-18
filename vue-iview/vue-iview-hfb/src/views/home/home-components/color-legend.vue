<template>
  <!--色卡，横版，放右下-->
  <div id="legend" class="metric-legend" data-tooltipsrc="CLICK_ON_LEGEND" style="color: white;"></div>
</template>

<script lang="ts">
import Vue from "vue"
import dolphin from "../../../components/dolphin";

export default Vue.extend({
  props: ["meteoType"],
  name: "",
  data() {
    return {
      meteoTypeUnit: {
        At0: "hPa",
        W: "kn",
        Cwh: "m",
        Ww: "m",
        Sw1: "m",
        Sw2: "m",
        Ss: "kn",
        St: "℃",
        Rh: "%",
        Tmp: "℃",
        Vis: "m",
        Tcdc: "m",
        Apcp: "mm",
        GW: "m/s",
        //SMA
        W_SMA: "kn",
        Cwh_SMA: "m",
        Ww_SMA: "m",
        Sw1_SMA: "m",
        Ss_SMA: "kn",
        St_SMA: "℃",
      },
    }
  },
  mounted() {
    this.colorRectangle("At0");
  },
  methods: {
    changeColor(meteoType) {
      if (meteoType == "W") {
        if (this.meteoTypeUnit.W == "kn") {
          this.meteoTypeUnit.W = 'm/s';
          this.colorRectangle(meteoType, 1);
        } else if (this.meteoTypeUnit.W == "m/s") {
          this.meteoTypeUnit.W = 'BF';
          this.colorRectangle(meteoType, 1);
        } else if (this.meteoTypeUnit.W == "BF") {
          this.meteoTypeUnit.W = 'kn';
          this.colorRectangle(meteoType, 1);
        }
      } else if (meteoType == "St") {
        if (this.meteoTypeUnit.St == "℃") {
          this.meteoTypeUnit.St = "℉";
          this.colorRectangle(meteoType, 1);
        } else if (this.meteoTypeUnit.St == "℉") {
          this.meteoTypeUnit.St = "℃";
          this.colorRectangle(meteoType, 1);
        }
      } else if (meteoType == "W_SMA") {
        if (this.meteoTypeUnit.W_SMA == "kn") {
          this.meteoTypeUnit.W_SMA = 'm/s';
          this.colorRectangle(meteoType, 1);
        } else if (this.meteoTypeUnit.W_SMA == "m/s") {
          this.meteoTypeUnit.W_SMA = 'BF';
          this.colorRectangle(meteoType, 1);
        } else if (this.meteoTypeUnit.W_SMA == "BF") {
          this.meteoTypeUnit.W_SMA = 'kn';
          this.colorRectangle(meteoType, 1);
        }
      } else if (meteoType == "St_SMA") {
        if (this.meteoTypeUnit.St_SMA == "℃") {
          this.meteoTypeUnit.St_SMA = "℉";
          this.colorRectangle(meteoType, 1);
        } else if (this.meteoTypeUnit.St_SMA == "℉") {
          this.meteoTypeUnit.St_SMA = "℃";
          this.colorRectangle(meteoType, 1);
        }
      }
    },

    diffrerntSek(formentlist1, formentlist2, formentlist3, formentlist4, tempColor, meteoType) {
      if (meteoType == "W" || meteoType == "W_SMA") {
        if (this.meteoTypeUnit.W == "m/s" || this.meteoTypeUnit.W_SMA == "m/s") {
          let spanObj1 = document.createElement('span');
          spanObj1.style.width = '21.5%';
          spanObj1.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist1 + "); width:100%;'>" + this.colorFormate(tempColor[0][0]) + "</span>";
          document.getElementById("legend").appendChild(spanObj1);
          let spanObj2 = document.createElement('span');
          spanObj2.style.width = '21.5%'
          spanObj2.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist2 + "); width:100%;'>" + this.colorFormate(tempColor[Math.round((tempColor.length - 1) * 0.34)][0]) + "</span>"
          document.getElementById("legend").appendChild(spanObj2);
          let spanObj3 = document.createElement('span');
          spanObj3.style.width = '21.5%';
          spanObj3.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist3 + "); width:100%;'>" + this.colorFormate(tempColor[Math.round((tempColor.length - 1) * 0.67)][0]) + "</span>";
          document.getElementById("legend").appendChild(spanObj3);
          let spanObj4 = document.createElement('span');
          spanObj4.style.width = '21.5%';
          spanObj4.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist4 + "); width:100%;'>" + this.colorFormate(tempColor[Math.round((tempColor.length - 1))][0]) + "</span>";
          document.getElementById("legend").appendChild(spanObj4);
        } else if (this.meteoTypeUnit.W == "BF" || this.meteoTypeUnit.W_SMA == "BF") {
          let spanObj1 = document.createElement('span');
          spanObj1.style.width = '21.5%';
          spanObj1.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist1 + "); width:100%;'>" + this.colorFormate(tempColor[0][0]) + "</span>";
          document.getElementById("legend").appendChild(spanObj1);
          let spanObj2 = document.createElement('span');
          spanObj2.style.width = '21.5%';
          spanObj2.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist2 + "); width:100%;'>" + this.colorFormate(dolphin.getBfBySpeed(Math.round(tempColor[Math.round((tempColor.length - 1) * 0.34)][0] / CONST.kn))) + "</span>";
          document.getElementById("legend").appendChild(spanObj2);
          let spanObj3 = document.createElement('span');
          spanObj3.style.width = '21.5%';
          spanObj3.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist3 + "); width:100%;'>" + this.colorFormate(dolphin.getBfBySpeed(Math.round(tempColor[Math.round((tempColor.length - 1) * 0.67)][0] / CONST.kn))) + "</span>";
          document.getElementById("legend").appendChild(spanObj3);
          let spanObj4 = document.createElement('span');
          spanObj4.style.width = '21.5%';
          spanObj4.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist4 + "); width:100%;'>" + this.colorFormate(dolphin.getBfBySpeed(Math.round((tempColor.length - 1)[0] / CONST.kn))) + "</span>";
          document.getElementById("legend").appendChild(spanObj4);
        } else if (this.meteoTypeUnit.W == "kn" || this.meteoTypeUnit.W_SMA == "kn") {
          let spanObj1 = document.createElement('span');
          spanObj1.style.width = '21.5%';
          spanObj1.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist1 + "); width:100%;'>" + this.colorFormate(tempColor[0][0]) + "</span>";
          document.getElementById("legend").appendChild(spanObj1);
          let spanObj2 = document.createElement('span');
          spanObj2.style.width = '21.5%';
          spanObj2.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist2 + "); width:100%;'>" + Math.round((this.colorFormate(tempColor[Math.round((tempColor.length - 1) * 0.34)][0])) / CONST.kn) + "</span>";
          document.getElementById("legend").appendChild(spanObj2);
          let spanObj3 = document.createElement('span');
          spanObj3.style.width = '21.5%';
          spanObj3.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist3 + "); width:100%;'>" + Math.round((this.colorFormate(tempColor[Math.round((tempColor.length - 1) * 0.67)][0])) / CONST.kn) + "</span>";
          document.getElementById("legend").appendChild(spanObj3);
          let spanObj4 = document.createElement('span');
          spanObj4.style.width = '21.5%';
          spanObj4.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist4 + "); width:100%;'>" + Math.round((this.colorFormate(tempColor[tempColor.length - 1][0])) / CONST.kn) + "</span>";
          document.getElementById("legend").appendChild(spanObj4)
        }
      } else if (meteoType == "St" || meteoType == "St_SMA") {
        if (this.meteoTypeUnit.St == "℉" || this.meteoTypeUnit.St_SMA == "℉") {
          let spanObj1 = document.createElement('span');
          spanObj1.style.width = '21.5%';
          spanObj1.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist1 + "); width:100%;'>" + Math.round(32 + (this.colorFormate(tempColor[0][0]) * 1.8)) + "</span>";
          document.getElementById("legend").appendChild(spanObj1);
          let spanObj2 = document.createElement('span');
          spanObj2.style.width = '21.5%';
          spanObj2.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist2 + "); width:100%;'>" + Math.round(32 + (this.colorFormate(tempColor[Math.round((tempColor.length - 1) * 0.34)][0]) * 1.8)) + "</span>";
          document.getElementById("legend").appendChild(spanObj2);
          let spanObj3 = document.createElement('span');
          spanObj3.style.width = '21.5%';
          spanObj3.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist3 + "); width:100%;'>" + Math.round(32 + (this.colorFormate(tempColor[Math.round((tempColor.length - 1) * 0.67)][0]) * 1.8)) + "</span>";
          document.getElementById("legend").appendChild(spanObj3);
          let spanObj4 = document.createElement('span');
          spanObj4.style.width = '21.5%';
          spanObj4.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist4 + "); width:100%;'>" + Math.round(32 + (this.colorFormate(tempColor[Math.round((tempColor.length - 1))][0]) * 1.8)) + "</span>";
          document.getElementById("legend").appendChild(spanObj4)
        } else if (this.meteoTypeUnit.St == "℃" || this.meteoTypeUnit.St_SMA == "℃") {
          let spanObj1 = document.createElement('span');
          spanObj1.style.width = '21.5%';
          spanObj1.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist1 + "); width:100%;'>" + this.colorFormate(tempColor[0][0]) + "</span>";
          document.getElementById("legend").appendChild(spanObj1);
          let spanObj2 = document.createElement('span');
          spanObj2.style.width = '21.5%';
          spanObj2.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist2 + "); width:100%;'>" + this.colorFormate(tempColor[Math.round((tempColor.length - 1) * 0.34)][0]) + "</span>";
          document.getElementById("legend").appendChild(spanObj2);
          let spanObj3 = document.createElement('span');
          spanObj3.style.width = '21.5%';
          spanObj3.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist3 + "); width:100%;'>" + this.colorFormate(tempColor[Math.round((tempColor.length - 1) * 0.67)][0]) + "</span>";
          document.getElementById("legend").appendChild(spanObj3);
          let spanObj4 = document.createElement('span');
          spanObj4.style.width = '21.5%';
          spanObj4.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist4 + "); width:100%;'>" + this.colorFormate(tempColor[tempColor.length - 1][0]) + "</span>";
          document.getElementById("legend").appendChild(spanObj4);
        }
      } else if (meteoType == "Vis") {
        let spanObj1 = document.createElement('span');
        spanObj1.style.width = '21.5%';
        spanObj1.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist1 + "); width:100%;'>" + (tempColor[0][0]) + "</span>";
        document.getElementById("legend").appendChild(spanObj1);
        let spanObj2 = document.createElement('span');
        spanObj2.style.width = '21.5%';
        spanObj2.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist2 + "); width:100%;'>" + (tempColor[Math.round((tempColor.length - 1) * 0.34)][0]) + "</span>";
        document.getElementById("legend").appendChild(spanObj2);
        let spanObj3 = document.createElement('span');
        spanObj3.style.width = '21.5%';
        spanObj3.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist3 + "); width:100%;'>" + (tempColor[Math.round((tempColor.length - 1) * 0.67)][0]) + "</span>";
        document.getElementById("legend").appendChild(spanObj3);
        let spanObj4 = document.createElement('span');
        spanObj4.style.width = '21.5%';
        spanObj4.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist4 + "); width:100%;'>" + (tempColor[tempColor.length - 1][0]) + "</span>";
        document.getElementById("legend").appendChild(spanObj4);
      } else if (meteoType == "Tmp") {
        let spanObj1 = document.createElement('span');
        spanObj1.style.width = '21.5%';
        spanObj1.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist1 + "); width:100%;'>" + (this.colorFormate(tempColor[0][0]) - CONSTMENU.K).toFixed(2) + "</span>";
        document.getElementById("legend").appendChild(spanObj1);
        let spanObj2 = document.createElement('span');
        spanObj2.style.width = '21.5%';
        spanObj2.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist2 + "); width:100%;'>" + (this.colorFormate(tempColor[Math.round((tempColor.length - 1) * 0.34)][0]) - CONSTMENU.K).toFixed(2) + "</span>";
        document.getElementById("legend").appendChild(spanObj2);
        let spanObj3 = document.createElement('span');
        spanObj3.style.width = '21.5%';
        spanObj3.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist3 + "); width:100%;'>" + (this.colorFormate(tempColor[Math.round((tempColor.length - 1) * 0.67)][0]) - CONSTMENU.K).toFixed(2) + "</span>";
        document.getElementById("legend").appendChild(spanObj3);
        let spanObj4 = document.createElement('span');
        spanObj4.style.width = '21.5%';
        spanObj4.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist4 + "); width:100%;'>" + (this.colorFormate(tempColor[tempColor.length - 1][0]) - CONSTMENU.K).toFixed(2) + "</span>";
        document.getElementById("legend").appendChild(spanObj4);
      } else {
        let spanObj1 = document.createElement('span');
        spanObj1.style.width = '21.5%';
        spanObj1.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist1 + "); width:100%;'>" + this.colorFormate(tempColor[0][0]) + "</span>";
        document.getElementById("legend").appendChild(spanObj1);
        let spanObj2 = document.createElement('span');
        spanObj2.style.width = '21.5%';
        spanObj2.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist2 + "); width:100%;'>" + this.colorFormate(tempColor[Math.round((tempColor.length - 1) * 0.34)][0]) + "</span>";
        document.getElementById("legend").appendChild(spanObj2);
        let spanObj3 = document.createElement('span');
        spanObj3.style.width = '21.5%';
        spanObj3.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist3 + "); width:100%;'>" + this.colorFormate(tempColor[Math.round((tempColor.length - 1) * 0.67)][0]) + "</span>";
        document.getElementById("legend").appendChild(spanObj3);
        let spanObj4 = document.createElement('span');
        spanObj4.style.width = '21.5%';
        spanObj4.innerHTML = "<span class='center' style='text-align:center;display: block;background: linear-gradient(" + 'to right' + formentlist4 + "); width:100%;'>" + this.colorFormate(tempColor[tempColor.length - 1][0]) + "</span>";
        document.getElementById("legend").appendChild(spanObj4);

      }

    },

    colorFormate(color) {
      if (color > 1000)
        color = color / 100;
      return color;
    },
  },
  watch: {
    meteoType(n, v) {
      if (n)
        this.colorRectangle(n);
    }
  }
})
</script>

<style scoped>
.metric-legend {
  width: 250px;
  background-color: #7c7c7c;
  white-space: nowrap;
  font-size: 10px;
  display: flex;
}
</style>
