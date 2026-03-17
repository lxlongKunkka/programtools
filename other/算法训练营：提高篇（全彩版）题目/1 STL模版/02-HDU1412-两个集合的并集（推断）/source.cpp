#include<cstdio>
#include<set>
using namespace std;
int n,m,x;
set<int> ans;

int main(){
    while(~scanf("%d%d", &n,&m)){//读取到文件尾结束，若手动输入，则按crl+z结束 
        ans.clear();
        for(int i=0;i<n;i++){
            scanf("%d", &x);
            ans.insert(x);
        }
        for(int j=0;j<m;j++){
            scanf("%d", &x);
            ans.insert(x);
        }
        for(set<int>::iterator it=ans.begin();it!=ans.end();it++){
            if(it!=ans.begin())
            	printf(" ");
            printf("%d",*it);
        }
        printf("\n");
    }
    return 0;
}
