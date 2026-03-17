//最小生成树 kruskal算法+并查集优化
#include<iostream>
#include<algorithm>
using namespace std;
const int N=1005;
int fa[N];
int n,m;
struct Edge{
	int u,v,w;
}e[N*N];

bool cmp(Edge x,Edge y){
	return x.w<y.w;
}

void init(int n){//初始化集合号 
    for(int i=1;i<=n;i++)
        fa[i]=i;
}

int find(int x){//查找x的集合号 
    if(x!=fa[x])//找祖宗 
		fa[x]=find(fa[x]);//把当前结点到其祖宗路径上的所有结点的集合号改为祖宗集合号
    return fa[x];
}

bool merge(int a,int b){//合并集合 
    int p=find(a);
    int q=find(b);
    if(p==q) return false;
    fa[q]=p;
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
