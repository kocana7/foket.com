Attribute VB_Name = "FoketBot"
' 포켓 로직 엑셀 → 포켓 봇 연결 (엑셀 2007 이상)
' 1) StartFoketBot 을 한 번 실행하면 10초마다 A1~F1 값을 봇 서버로 보냅니다.
' 2) 신호가 날 때 SendFoketSignal "NQ 매수 21000" 처럼 부르면 이용 회원 전체에게 바로 나갑니다.
'    (신호 셀이 정해지면 아이티가 이 부분을 자동으로 연결합니다)
Option Explicit

Const BOT_URL As String = "http://서버주소:8080"   ' 서버 준비 후 아이티가 채움
Const BOT_KEY As String = "SIGNAL_KEY와_같은_값"
Const SHEET_NAME As String = ""                    ' 비우면 첫 번째 시트
Const PUSH_SECONDS As Long = 10

Dim nextRun As Date
Dim lastPosition As String

Public Sub StartFoketBot()
    PushPosition
End Sub

Public Sub StopFoketBot()
    On Error Resume Next
    Application.OnTime nextRun, "PushPosition", , False
End Sub

Private Function Ws() As Worksheet
    If SHEET_NAME = "" Then
        Set Ws = ThisWorkbook.Worksheets(1)
    Else
        Set Ws = ThisWorkbook.Worksheets(SHEET_NAME)
    End If
End Function

Public Sub PushPosition()
    On Error Resume Next
    Dim i As Long, v As String, cells As String
    For i = 1 To 6
        v = CStr(Ws.Cells(1, i).Text)
        cells = cells & IIf(i > 1, ",", "") & """" & JsonEsc(v) & """"
    Next i
    ' 값이 그대로여도 1분에 한 번은 보내서 "연결 끊김" 표시가 뜨지 않게 함
    If cells <> lastPosition Or Second(Now) < PUSH_SECONDS Then
        PostJson "/position", "{""key"":""" & BOT_KEY & """,""cells"":[" & cells & "]}"
        lastPosition = cells
    End If
    nextRun = Now + TimeSerial(0, 0, PUSH_SECONDS)
    Application.OnTime nextRun, "PushPosition"
End Sub

Public Sub SendFoketSignal(ByVal text As String, Optional ByVal service As String = "all")
    PostJson "/signal", "{""key"":""" & BOT_KEY & """,""service"":""" & service & """,""text"":""" & JsonEsc(text) & """}"
End Sub

Private Sub PostJson(ByVal path As String, ByVal body As String)
    On Error Resume Next
    Dim h As Object
    Set h = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    h.setTimeouts 3000, 3000, 5000, 5000
    h.Open "POST", BOT_URL & path, False
    h.setRequestHeader "Content-Type", "application/json; charset=utf-8"
    h.send body
End Sub

Private Function JsonEsc(ByVal s As String) As String
    s = Replace(s, "\", "\\")
    s = Replace(s, """", "\""")
    s = Replace(s, vbCr, "")
    s = Replace(s, vbLf, "\n")
    JsonEsc = s
End Function
