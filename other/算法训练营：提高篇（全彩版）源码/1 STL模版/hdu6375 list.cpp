#include<cstdio>
#include<list>
using namespace std;
const int maxn=15e4+10;
int n,m;
list<int> ls[maxn];

void read(int &x){
	char ch=getchar();x=0;
	for(;ch<'0'||ch>'9';ch=getchar());
	for(;ch>='0'&&ch<='9';ch=getchar()) x=x*10+ch-'0';
}

int main(){
	while(~scanf("%d%d",&n,&m)){
		for(int i=1;i<=n;i++)
			ls[i].clear();
		int k,u,v,w,val;
		while(m--){
			read(k);
			switch(k){
			case 1:
				read(u),read(w),read(val);
				if(w==0)
					ls[u].push_front(val);
				else
					ls[u].push_back(val);
				break;	
			case 2:
				read(u),read(w);
				if(ls[u].empty())
					printf("-1\n");
				else{
					if(w==0){
						printf("%d\n",ls[u].front());
						ls[u].pop_front();
					}
					else{
						printf("%d\n",ls[u].back());
						ls[u].pop_back();
					}
				}
				break;
			case 3:
				read(u),read(v),read(w);
				if(w)
					ls[v].reverse();
				ls[u].splice(ls[u].end(),ls[v]);//splice拼接函数会自动清空v，常数时间 
				break;
			}
		}
	}
	return 0;
}
