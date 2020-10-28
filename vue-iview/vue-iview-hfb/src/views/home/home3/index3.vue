<template>
  <div class="home">
    <tsx-table :hSize="this.hSize"></tsx-table>
    <Table
        context-menu
        show-context-menu
        border
        :columns="columns1"
        :data="data1"
        @on-contextmenu="handleContextMenu"
        :span-method="handleSpan"
    >
      <template slot="contextMenu">
        <DropdownItem @click.native="handleContextMenuEdit">编辑</DropdownItem>
        <DropdownItem @click.native="handleContextMenuDelete" style="color: #ed4014">删除</DropdownItem>
      </template>
    </Table>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import TsxTable from "./tsx-table.vue";

export default Vue.extend({
  // functional: true,
  name: "",
  components: {
    TsxTable,
  },
  data() {
    return {
      hSize: 2,
      berthPorts: [
        {name: "AMSTERDAM", time: new Date()},
      ],
      columns1: [
        {
          title: 'Name',
          key: 'name',
          render: (h, params) => {
            return h('div', [
              h('Icon', {
                props: {
                  type: 'person'
                }
              }),
              h('strong', params.row.name)
            ]);
          }
        },
        {
          title: 'Age',
          key: 'age'
        },
        {
          title: 'Address',
          key: 'address'
        },
        {
          title: 'Action',
          key: 'action',
          width: 150,
          align: 'center',
          render: (h, params) => {
            return h('div', [
              h('Button', {
                props: {
                  type: 'primary',
                  size: 'small'
                },
                style: {
                  marginRight: '5px'
                },
                on: {
                  click: () => {
                    (this as any).show(params.index)
                  }
                }
              }, 'View'),
              h('Button', {
                props: {
                  type: 'error',
                  size: 'small'
                },
                on: {
                  click: () => {
                    (this as any).remove(params.index)
                  }
                }
              }, 'Delete')
            ]);
          }
        }
      ],
      data1: [
        {
          name: 'John Brown',
          age: 18,
          address: 'New York No. 1 Lake Park'
        },
        {
          name: 'Jim Green',
          age: 24,
          address: 'London No. 1 Lake Park'
        },
        {
          name: 'Joe Black',
          age: 30,
          address: 'Sydney No. 1 Lake Park'
        },
        {
          name: 'Jon Snow',
          age: 26,
          address: 'Ottawa No. 2 Lake Park'
        }
      ],
      contextLine: 0
    }
  },
  mounted() {
    this.initUser();
    this.$nextTick(() => {

    });
  },
  activated() {
    this.$nextTick(() => {

    });
  },
  methods: {
    initUser() {
    },
    show(index) {
      this.$Modal.info({
        title: 'User Info',
        content: `Name：${this.data1[index].name}<br>Age：${this.data1[index].age}<br>Address：${this.data1[index].address}`
      })
    },
    remove(index) {
      this.data1.splice(index, 1);
    },
    handleContextMenu(row, event, position) {
      console.log(row, event, position)
      const index = this.data1.findIndex(item => item.name === row.name);
      this.contextLine = index + 1;
    },
    handleContextMenuEdit() {
      this.$Message.info('Click edit of line' + this.contextLine);
    },
    handleContextMenuDelete() {
      this.$Message.info('Click delete of line' + this.contextLine);
    },
    handleSpan({row, column, rowIndex, columnIndex}) {
      if (rowIndex === 0 && columnIndex === 0) {
        return [1, 2];
      } else if (rowIndex === 0 && columnIndex === 1) {
        return [0, 0];
      }
      if (rowIndex === 2 && columnIndex === 0) {
        return {
          rowspan: 2,
          colspan: 1
        };
      } else if (rowIndex === 3 && columnIndex === 0) {
        return {
          rowspan: 0,
          colspan: 0
        };
      }
    },
  },

})
</script>

<style scoped lang="less">
.home {
  width: 100%;
  height: 100%;
}

</style>
