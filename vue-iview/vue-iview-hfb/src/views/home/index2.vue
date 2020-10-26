<template>
  <div class="home">
    <component v-for="(item,i) in components5" :key="i" :is="item.component"></component>

    <remote-js :src="url"></remote-js>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import RemoteJs from "@/views/home/remote/remote-js.vue";

export default Vue.extend({
  // functional: true,
  name: "index1",
  props: {
    allComponentNames: {
      type: Array,
      default: () => ["RemoteAsyncExample", "OtherAsyncExample"]
    }
  },
  components: {
    RemoteJs,
  },
  data() {
    return {
      hSize: 2,
      components5: [],
      url:"http://192.168.182.128/OtherAsyncExample.jsx",
    }
  },
  created() {
    // fixme 方法1 通过向子组件传递属性props来加载
    /*this.allComponentNames.forEach((componentName: string) => {
      this.components5.push({
        component: () => import("../../../public/jsx/" + `${componentName}`)
      });
    });*/
    // fixme 方法2 通过router路由传值来加载
    /*if(this.$route.query){
      this.$route.query.allComponentNames.forEach(componentName => {
        this.components5.push({
          component: () => import("../../../public/jsx/"+`${componentName}`)
        });
      });
    }*/
    // todo 方法3
    /*const s = document.createElement('script');
    // s.type = 'text/javascript';
    s.type = 'text/jsx';
    s.src = url;
    document.body.appendChild(s);*/
  },

})
</script>
<style scoped lang="less">
.home {
  width: 100%;
  height: 100%;
}
</style>

