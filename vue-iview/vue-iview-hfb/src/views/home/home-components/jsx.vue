<script lang="jsx">
export default {
  // todo
  // functional: true,
  name: "jsx-template",
  components: {},
  props: {
    hSize: {
      type: Number,
      default: 1
    }
  },
  data() {
    return {
      columns1: [
        {
          title: 'Name',
          key: 'name'
        },
        {
          title: 'Age',
          key: 'age'
        },
        {
          title: 'Address',
          key: 'address'
        }
      ],
      data1: [
        {
          name: 'John Brown',
          age: 18,
          address: 'New York No. 1 Lake Park',
          date: '2016-10-03'
        },
        {
          name: 'Jim Green',
          age: 24,
          address: 'London No. 1 Lake Park',
          date: '2016-10-01'
        },
        {
          name: 'Joe Black',
          age: 30,
          address: 'Sydney No. 1 Lake Park',
          date: '2016-10-02'
        },
        {
          name: 'Jon Snow',
          age: 26,
          address: 'Ottawa No. 2 Lake Park',
          date: '2016-10-04'
        }
      ]
    }
  },
  render(h, context) {
    /*return <div class="red">
      <i-button type="info" percent="80">jsx</i-button>
    </div>*/

    /*const Tag=`h1`;
    return <Tag>111</Tag>*/

    /*return (
        <i-table columns={this.columns1} data={this.data1}>

        </i-table>
    );*/

    /*let hText = `<h${this.hSize}>${this.columns1[0].key}</h${this.hSize}>`;
    // let hText = "<h" + this.hSize + ">" + this.columns1[0].key + "</h" + this.hSize + ">";
    return (
        <div domPropsInnerHTML={hText}>

        </div>
    );*/

    /*const inputAttrs = {
      type: 'email',
      placeholder: 'Enter your email'
    }
    return <input {...{ attrs: inputAttrs }} />*/


    const inputAttrs = {
      shape: "circle",
      type: "info",
      percent: "80"
    }
    return <div class="red">
      <i-button {...{attrs: inputAttrs}} >jsx</i-button>
    </div>


    let hText = `
    <div class="red">
      <i-button vModel=${{inputAttrs}} >jsx</i-button>
    </div>
    `;

    return (
        <div domPropsInnerHTML={hText}>

        </div>
    );

    // let hText = `<i-table columns={this.columns1} data={this.data1} ></i-table>`;
    // let hText = "<i-table columns={" + this.columns1 + "} data={" + this.data1 + "} ></i-table>";



  }
}
</script>