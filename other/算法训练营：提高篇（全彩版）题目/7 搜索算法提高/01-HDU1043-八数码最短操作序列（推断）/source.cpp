#include<cstdio>//A*，cantor+欧氏距离+优先队列，hdu1043 733ms，poj1077 0ms 
#include<cstring>
#include<cstdlib>
#include<algorithm>
#include<queue>
#include<stack>
using namespace std;
const int N=362880+10;
const int dir[4][2]={1,0,0,1,-1,0,0,-1};
const char to_c[]="drul";
struct node{
    int f,g,h;
    int x;//'x'的位置 
    int a[9];
    bool operator < (const node &a) const{
        return f>a.f;
    }
};
node start,nex;//G++不允许定义next 
int fac[10],vis[N],pre[N];
char ans[N];

bool check(node s){//判断是否有解 
    int cnt=0;
    for(int i=0;i<9;i++){
    	if(s.a[i]==8) continue;
    	for(int j=i+1;j<9;j++)
			if(s.a[j]<s.a[i]) cnt++;
	}
    if(cnt%2) return 0;
    return 1; 
}

int cantor(node s){//康托判重 
    int code=0;
    for(int i=0;i<9;i++){
        int cnt=0;
        for(int j=i+1;j<9;j++)
			if(s.a[j]<s.a[i]) cnt++;
        code+=fac[8-i]*cnt;
    }
    return code;
}

int h(node s){//启发函数，曼哈顿距离（行列差绝对值之和） 
	int cost=0;
	for(int i=0;i<9;i++){
		if(s.a[i]!=8)
			cost+=abs(i/3-s.a[i]/3)+abs(i%3-s.a[i]%3);
	}
	return cost;
}

void Astar(){
    int k_s,k_n;
    priority_queue<node>q;
    while(!q.empty()) q.pop();
    memset(vis,0,sizeof(vis));
    start.g=0;start.f=start.h=h(start);
    vis[cantor(start)]=1;
    q.push(start);
    while(!q.empty()){
        node t=q.top();
        q.pop();
        k_s=cantor(t);
        for(int i=0;i<4;i++){
        	nex=t;
            int row=t.x/3+dir[i][0];
			int col=t.x%3+dir[i][1];
			int newx=row*3+col;//转换为数字 
			if(row<0||row>2||col<0||col>2) continue;
            swap(nex.a[t.x],nex.a[newx]);
            nex.x=newx;
            nex.g++;
			nex.h=h(nex);
            nex.f=nex.g+nex.h;
            k_n=cantor(nex);
            if(vis[k_n]) continue;
            vis[k_n]=1;
            q.push(nex);
            pre[k_n]=k_s;
            ans[k_n]=to_c[i];
            if(k_n==0) return;
        }  
    }
}

int main(){
    int judge,now;
    fac[0]=1;
    for(int i=1;i<9;i++) fac[i]=fac[i-1]*i;
    while(~scanf("%s",ans)){
		if(ans[0]>'0'&&ans[0]<'9')
			start.a[0]=ans[0]-'0'-1;
		else if(ans[0]=='x')
			start.x=0,start.a[0]=8;
		for(int i=1;i<9;i++){
			scanf("%s",ans);
			if(ans[0]>'0'&&ans[0]<'9')
				start.a[i]=ans[0]-'0'-1;
			else if(ans[0]=='x')
				start.x=i,start.a[i]=8;
		}
        if(!check(start)) {printf("unsolvable\n"); continue;}
        judge=cantor(start);
		now=0;
        Astar(); 
        stack<int>s;
        while(judge!=now){
            s.push(ans[now]);
            now=pre[now];
        }
        while(!s.empty()){
            printf("%c",s.top());
            s.pop();
        }
        printf("\n");
    }
    return 0;
}
