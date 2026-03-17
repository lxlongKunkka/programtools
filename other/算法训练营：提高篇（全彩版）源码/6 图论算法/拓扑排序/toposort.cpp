#include<iostream>
#include<cstring>
#include<stack>
using namespace std;
const int maxn=105,maxe=20010;
int n,m,cnt;
int head[maxn]; //链式前向星头 
int in[maxn],topo[maxn]; //入度,拓扑序列 
stack<int>s;
struct node{
	int to,next,w;
}e[maxe];

void add(int u,int v){
	e[cnt].to=v;
	e[cnt].next=head[u];
	head[u]=cnt++;
}

bool toposort(){//拓扑排序
	int k=0;
	for(int i=0;i<n;i++)
		if(in[i]==0)
			s.push(i);
	while(!s.empty()){
		int u=s.top();
		s.pop();
		topo[k++]=u;
		for(int i=head[u];~i;i=e[i].next){
			int v=e[i].to;
			if(--in[v]==0)
				s.push(v);
		}      
	}
	if(k<n) return 0;//该有向图有回路
	return 1;
}

int main(){
    int u,v;
	cin>>n>>m;
    memset(head,-1,sizeof(head));
    memset(in,0,sizeof(in));
    cnt=0;
    for(int i=0;i<m;i++){
        cin>>u>>v;
        add(u,v);
        in[v]++;
    }
	toposort();
	for(int i=0;i<n-1;i++)
		cout<<topo[i]<<" ";
	cout<<topo[n-1]<<endl;
    return 0;
}
/*测试数据
6 8
0 1
0 2
0 3
2 1
2 4
3 4
5 3
5 4
*/ 
