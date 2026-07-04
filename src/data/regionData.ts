export interface CascaderOption {
  value: string
  label: string
  children?: CascaderOption[]
}

export const regionCascaderData: CascaderOption[] = [
  {
    value: 'beijing',
    label: '北京市',
    children: [
      {
        value: 'beijing_city',
        label: '北京市',
        children: [
          { value: 'dongcheng', label: '东城区' },
          { value: 'xicheng', label: '西城区' },
          { value: 'chaoyang', label: '朝阳区' },
          { value: 'haidian', label: '海淀区' },
          { value: 'fengtai', label: '丰台区' },
          { value: 'shijingshan', label: '石景山区' },
          { value: 'tongzhou', label: '通州区' },
          { value: 'changping', label: '昌平区' },
          { value: 'daxing', label: '大兴区' },
          { value: 'shunyi', label: '顺义区' },
          { value: 'fangshan', label: '房山区' },
          { value: 'mentougou', label: '门头沟区' },
          { value: 'pinggu', label: '平谷区' },
          { value: 'huairou', label: '怀柔区' },
          { value: 'miyun', label: '密云区' },
          { value: 'yanqing', label: '延庆区' }
        ]
      }
    ]
  },
  {
    value: 'tianjin',
    label: '天津市',
    children: [
      {
        value: 'tianjin_city',
        label: '天津市',
        children: [
          { value: 'heping', label: '和平区' },
          { value: 'hedong', label: '河东区' },
          { value: 'hexi', label: '河西区' },
          { value: 'nankai', label: '南开区' },
          { value: 'hebei_q', label: '河北区' },
          { value: 'hongqiao', label: '红桥区' },
          { value: 'dongli', label: '东丽区' },
          { value: 'xiqing', label: '西青区' },
          { value: 'jinnan', label: '津南区' },
          { value: 'beichen', label: '北辰区' },
          { value: 'wuqing', label: '武清区' },
          { value: 'baodi', label: '宝坻区' },
          { value: 'binhai', label: '滨海新区' },
          { value: 'ninghe', label: '宁河区' },
          { value: 'jinghai', label: '静海区' },
          { value: 'jizhou', label: '蓟州区' }
        ]
      }
    ]
  },
  {
    value: 'shanghai',
    label: '上海市',
    children: [
      {
        value: 'shanghai_city',
        label: '上海市',
        children: [
          { value: 'huangpu', label: '黄浦区' },
          { value: 'xuhui', label: '徐汇区' },
          { value: 'changning', label: '长宁区' },
          { value: 'jingan', label: '静安区' },
          { value: 'putuo', label: '普陀区' },
          { value: 'hongkou', label: '虹口区' },
          { value: 'yangpu', label: '杨浦区' },
          { value: 'pudong', label: '浦东新区' },
          { value: 'minhang', label: '闵行区' },
          { value: 'baoshan', label: '宝山区' },
          { value: 'jiading', label: '嘉定区' },
          { value: 'jinshan', label: '金山区' },
          { value: 'songjiang', label: '松江区' },
          { value: 'qingpu', label: '青浦区' },
          { value: 'fengxian', label: '奉贤区' },
          { value: 'chongming', label: '崇明区' }
        ]
      }
    ]
  },
  {
    value: 'guangdong',
    label: '广东省',
    children: [
      {
        value: 'guangzhou',
        label: '广州市',
        children: [
          { value: 'yuexiu', label: '越秀区' },
          { value: 'haizhu', label: '海珠区' },
          { value: 'liwan', label: '荔湾区' },
          { value: 'tianhe', label: '天河区' },
          { value: 'baiyun', label: '白云区' },
          { value: 'huangpu_gz', label: '黄埔区' },
          { value: 'huadu', label: '花都区' },
          { value: 'panyu', label: '番禺区' },
          { value: 'nanhai', label: '南沙区' },
          { value: 'conghua', label: '从化区' },
          { value: 'zengcheng', label: '增城区' }
        ]
      },
      {
        value: 'shenzhen',
        label: '深圳市',
        children: [
          { value: 'futian', label: '福田区' },
          { value: 'luohu', label: '罗湖区' },
          { value: 'nanshan', label: '南山区' },
          { value: 'baoan', label: '宝安区' },
          { value: 'longgang', label: '龙岗区' },
          { value: 'yantian', label: '盐田区' },
          { value: 'longhua', label: '龙华区' },
          { value: 'pingshan', label: '坪山区' },
          { value: 'guangming', label: '光明区' }
        ]
      },
      {
        value: 'dongguan',
        label: '东莞市',
        children: [
          { value: 'guancheng', label: '莞城街道' },
          { value: 'nancheng', label: '南城街道' },
          { value: 'dongcheng', label: '东城街道' },
          { value: 'wanjiang', label: '万江街道' },
          { value: 'shijie', label: '石碣镇' },
          { value: 'shilong', label: '石龙镇' },
          { value: 'chashan', label: '茶山镇' },
          { value: 'shatian', label: '沙田镇' }
        ]
      },
      {
        value: 'foshan',
        label: '佛山市',
        children: [
          { value: 'chancheng', label: '禅城区' },
          { value: 'nanhai_fs', label: '南海区' },
          { value: 'shunde', label: '顺德区' },
          { value: 'sanshui', label: '三水区' },
          { value: 'gaoming', label: '高明区' }
        ]
      }
    ]
  },
  {
    value: 'jiangsu',
    label: '江苏省',
    children: [
      {
        value: 'nanjing',
        label: '南京市',
        children: [
          { value: 'xuanwu', label: '玄武区' },
          { value: 'qinhuai', label: '秦淮区' },
          { value: 'jianye', label: '建邺区' },
          { value: 'gulou', label: '鼓楼区' },
          { value: 'yuhuatai', label: '雨花台区' },
          { value: 'qixia', label: '栖霞区' },
          { value: 'jiangning', label: '江宁区' },
          { value: 'pukou', label: '浦口区' },
          { value: 'luhe', label: '六合区' },
          { value: 'lishui', label: '溧水区' },
          { value: 'gaochun', label: '高淳区' }
        ]
      },
      {
        value: 'suzhou',
        label: '苏州市',
        children: [
          { value: 'gusu', label: '姑苏区' },
          { value: 'wuzhong', label: '吴中区' },
          { value: 'xiangcheng', label: '相城区' },
          { value: 'gongyuan', label: '工业园区' },
          { value: 'huqiu', label: '虎丘区' },
          { value: 'wuzhong_sz', label: '吴江区' },
          { value: 'kunshan', label: '昆山市' },
          { value: 'taicang', label: '太仓市' },
          { value: 'changshu', label: '常熟市' },
          { value: 'zhangjiagang', label: '张家港市' }
        ]
      },
      {
        value: 'wuxi',
        label: '无锡市',
        children: [
          { value: 'liangxi', label: '梁溪区' },
          { value: 'xinwu', label: '新吴区' },
          { value: 'binhu', label: '滨湖区' },
          { value: 'xishan', label: '锡山区' },
          { value: 'huishan', label: '惠山区' },
          { value: 'jiangyin', label: '江阴市' },
          { value: 'yixing', label: '宜兴市' }
        ]
      }
    ]
  },
  {
    value: 'zhejiang',
    label: '浙江省',
    children: [
      {
        value: 'hangzhou',
        label: '杭州市',
        children: [
          { value: 'shangcheng', label: '上城区' },
          { value: 'gongshu', label: '拱墅区' },
          { value: 'xihu', label: '西湖区' },
          { value: 'binjiang', label: '滨江区' },
          { value: 'xiaoshan', label: '萧山区' },
          { value: 'yuhang', label: '余杭区' },
          { value: 'fuyang', label: '富阳区' },
          { value: 'linan', label: '临安区' },
          { value: 'tonglu', label: '桐庐县' },
          { value: 'chunan', label: '淳安县' },
          { value: 'jiande', label: '建德市' }
        ]
      },
      {
        value: 'ningbo',
        label: '宁波市',
        children: [
          { value: 'haishu', label: '海曙区' },
          { value: 'jiangbei', label: '江北区' },
          { value: 'zhenhai', label: '镇海区' },
          { value: 'beilun', label: '北仑区' },
          { value: 'yinzhou', label: '鄞州区' },
          { value: 'fenghua', label: '奉化区' },
          { value: 'yuyao', label: '余姚市' },
          { value: 'cixi', label: '慈溪市' },
          { value: 'xiangshan', label: '象山县' },
          { value: 'ninghai', label: '宁海县' }
        ]
      },
      {
        value: 'wenzhou',
        label: '温州市',
        children: [
          { value: 'lucheng', label: '鹿城区' },
          { value: 'longwan', label: '龙湾区' },
          { value: 'ouhai', label: '瓯海区' },
          { value: 'dongtou', label: '洞头区' },
          { value: 'ruian', label: '瑞安市' },
          { value: 'yueqing', label: '乐清市' },
          { value: 'yongjia', label: '永嘉县' },
          { value: 'pingyang', label: '平阳县' },
          { value: 'cangnan', label: '苍南县' },
          { value: 'wencheng', label: '文成县' },
          { value: 'taishun', label: '泰顺县' }
        ]
      }
    ]
  },
  {
    value: 'sichuan',
    label: '四川省',
    children: [
      {
        value: 'chengdu',
        label: '成都市',
        children: [
          { value: 'jinjiang', label: '锦江区' },
          { value: 'qingyang', label: '青羊区' },
          { value: 'jinniu', label: '金牛区' },
          { value: 'wuhou', label: '武侯区' },
          { value: 'chenghua', label: '成华区' },
          { value: 'gaoxin', label: '高新区' },
          { value: 'longquanyi', label: '龙泉驿区' },
          { value: 'qingbaijiang', label: '青白江区' },
          { value: 'xindu', label: '新都区' },
          { value: 'wenjiang', label: '温江区' },
          { value: 'shuangliu', label: '双流区' },
          { value: 'pidu', label: '郫都区' },
          { value: 'tianfuxinqu', label: '天府新区' }
        ]
      },
      {
        value: 'mianyang',
        label: '绵阳市',
        children: [
          { value: 'fucheng', label: '涪城区' },
          { value: 'youxian', label: '游仙区' },
          { value: 'anjuxian', label: '安州区' },
          { value: 'jiangyou', label: '江油市' }
        ]
      }
    ]
  },
  {
    value: 'hubei',
    label: '湖北省',
    children: [
      {
        value: 'wuhan',
        label: '武汉市',
        children: [
          { value: 'jiangan', label: '江岸区' },
          { value: 'jianghan', label: '江汉区' },
          { value: 'qiaokou', label: '硚口区' },
          { value: 'hanyang', label: '汉阳区' },
          { value: 'wuchang', label: '武昌区' },
          { value: 'qingshan', label: '青山区' },
          { value: 'hongshan', label: '洪山区' },
          { value: 'dongxihu', label: '东西湖区' },
          { value: 'hannan', label: '汉南区' },
          { value: 'caidian', label: '蔡甸区' },
          { value: 'jiangxia', label: '江夏区' },
          { value: 'huangpi', label: '黄陂区' },
          { value: 'xinzhou', label: '新洲区' }
        ]
      },
      {
        value: 'yichang',
        label: '宜昌市',
        children: [
          { value: 'xiling', label: '西陵区' },
          { value: 'wujiagang', label: '伍家岗区' },
          { value: 'dianjun', label: '点军区' },
          { value: 'xiaoting', label: '猇亭区' },
          { value: 'yiling', label: '夷陵区' }
        ]
      }
    ]
  },
  {
    value: 'shandong',
    label: '山东省',
    children: [
      {
        value: 'jinan',
        label: '济南市',
        children: [
          { value: 'lixia', label: '历下区' },
          { value: 'shizhong', label: '市中区' },
          { value: 'huaiyin', label: '槐荫区' },
          { value: 'tianqiao', label: '天桥区' },
          { value: 'licheng', label: '历城区' },
          { value: 'changqing', label: '长清区' },
          { value: 'zhangqiu', label: '章丘区' }
        ]
      },
      {
        value: 'qingdao',
        label: '青岛市',
        children: [
          { value: 'shinan', label: '市南区' },
          { value: 'shibei', label: '市北区' },
          { value: 'huangdao', label: '黄岛区' },
          { value: 'laoshan', label: '崂山区' },
          { value: 'licang', label: '李沧区' },
          { value: 'chengyang', label: '城阳区' },
          { value: 'jimo', label: '即墨区' },
          { value: 'jiaozhou', label: '胶州市' },
          { value: 'pingdu', label: '平度市' },
          { value: 'laixi', label: '莱西市' }
        ]
      }
    ]
  },
  {
    value: 'fujian',
    label: '福建省',
    children: [
      {
        value: 'fuzhou',
        label: '福州市',
        children: [
          { value: 'gulou_fz', label: '鼓楼区' },
          { value: 'taijiang', label: '台江区' },
          { value: 'cangshan', label: '仓山区' },
          { value: 'jinan_fz', label: '晋安区' },
          { value: 'mawei', label: '马尾区' },
          { value: 'changle', label: '长乐区' }
        ]
      },
      {
        value: 'xiamen',
        label: '厦门市',
        children: [
          { value: 'siming', label: '思明区' },
          { value: 'huli', label: '湖里区' },
          { value: 'jimei', label: '集美区' },
          { value: 'haicang', label: '海沧区' },
          { value: 'tongan', label: '同安区' },
          { value: 'xiangan', label: '翔安区' }
        ]
      }
    ]
  }
]
