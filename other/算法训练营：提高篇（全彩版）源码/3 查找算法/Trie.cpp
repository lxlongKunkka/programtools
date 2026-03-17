#include<iostream>
#include<string>
#include<cstring>
using namespace std;
const int maxn=100005;
const int maxz=26;//不同字符个数，例如数字10，小写字母26
int trie[maxn][maxz];
bool end[maxn];//标识单词结束 
int n,tot;//字符串数,下标 

void init(){
	memset(trie,0,sizeof(trie));
	memset(end,false,sizeof(end));
	tot=1;
} 

void insert(string s){//将字符串s插入到字典树中
	int p=1;
	for(int i=0;i<s.size();i++){
		int ch=s[i]-'a';//转换成数字
		if(!trie[p][ch]) 
			trie[p][ch]=++tot;//记录下标 
		p=trie[p][ch];	 	
	}
	end[p]=true;//标记单词结束 
}

bool search(string s){//在字典树中查找该字符串是否存在 
	int p=1;
	for(int i=0;i<s.size();i++){
		p=trie[p][s[i]-'a'];
		if(!p)
			return false;
	}
	return end[p];
}

bool prefix(string s){//在字典树中查找该字符串是否为其它字符串的前缀 
	int p=1;
	for(int i=0;i<s.size();i++){
		p=trie[p][s[i]-'a'];
		if(!p)
			return false;
	}
	return true;
} 

void dfs(int p){//深度优先遍历，用于测试 
	for(int i=0;i<26;i++){
		if(trie[p][i]){
			cout<<char(i+'a');
			dfs(trie[p][i]);
		}
	}
	cout<<endl;	
}

int main(){	
	string s;
	init();//初始化 
	cin>>n;
	while(n--){
		cin>>s;
		insert(s);
	}
	dfs(1);//深度优先遍历测试 
	cout<<"输入要查询的字符串："<<endl;
	cin>>s;
	if(search(s))
		cout<<"查询成功！"<<endl; 
	else
		cout<<"查询失败！"<<endl;
	cout<<"输入要查询的字符串（prefix）："<<endl;
	cin>>s;
	if(prefix(s))
		cout<<s<<"是其它字符串的前缀！"<<endl; 
	else
		cout<<s<<"不是其它字符串的前缀！"<<endl;
	return 0;
}
/*
5
good
very
map
goat
marry
*/
