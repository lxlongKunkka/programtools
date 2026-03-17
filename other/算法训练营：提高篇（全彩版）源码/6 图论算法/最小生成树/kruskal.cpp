//最小生成树 kruskal算法
#include<iostream>
#include<algorithm>
using namespace std;
const int N=1005;
int nodeset[N];
int n,m;
struct Edge{
	int u,v,w;
}e[N*N];

bool cmp(Edge x,Edge y){//定义优先级，按边值进行升序排序
	return x.w<y.w;
}

void init(int n){//每个结点初始化一个集合号
    for(int i=1;i<=n;i++)
        nodeset[i]=i;
}

bool merge(int a,int b){//合并集合
    int p=nodeset[a];//p为a结点的集合号
    int q=nodeset[b];//q为b结点的集合号
    if(p==q) return false;//集合号相同，什么也不做，返回
    for(int i=1;i<=n;i++){//检查所有结点，把集合号是q的改为p
    	if(nodeset[i]==q)
    		nodeset[i]=p;
    }
    return true;
}

int kruskal(int n){//求最小生成树 
    int ans=0,cnt=0;
    for(int i=0;i<m;i++){
    	if(merge(e[i].u,e[i].v)){
            ans+=e[i].w;
            cnt++;
            if(cnt==n-1)//选中n-1条边结束 
                return ans;
        }
	}      
    return 0;
}

int main(){
	int t;
	cin>>t;
	while(t--){
        cin>>n>>m;
        init(n);
        for(int i=0;i<m;i++)
            cin>>e[i].u>>e[i].v>>e[i].w;
        sort(e,e+m,cmp);
        cout<<kruskal(n)<<endl;
	}
    return 0;
}
/*测试样例 
1
7 12
1 2 23
1 6 28
1 7 36
2 3 20
2 7 1
3 4 15
3 7 4
4 5 3
4 7 9
5 6 17
5 7 16
6 7 25
*/ 
